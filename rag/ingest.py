"""
rag/ingest.py

Orchestrates the full document ingestion pipeline for AthenaChat.
Accepts a file path and client ID, processes the document through
validation, extraction, chunking, embedding, and vector storage.

Pipeline:
    validate → hash → dedup check → extract → chunk → embed → store → metadata

Usage:
    result = ingest("path/to/doc.pdf", "client_123")
"""

import json
from datetime import datetime
from pathlib import Path
from qdrant_client import QdrantClient

from rag.config import QDRANT_URL, QDRANT_API_KEY, EMBEDDING_MODEL, DEBUG, Colors
from rag.utils.pdf import (
    validate_file,
    generate_filename,
    generate_doc_id,
    compute_file_hash,
    extract_text,
    save_metadata,
    cleanup_on_failure
)
from rag.utils.chunker import chunk_text
from rag.utils.qdrant import (
    get_or_create_collection,
    add_points,
    remove_points,
    update_metadata as update_qdrant_metadata
)


# Module-level Qdrant client — created once, reused across all ingest calls
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def ingest(file_path: str | Path, client_id: str) -> dict:
    """
    Runs the full ingestion pipeline for a single document.

    Validates the file, extracts text, chunks it, generates hybrid
    embeddings, and stores vectors in Qdrant with full metadata.

    Handles deduplication — skips exact duplicates, re-ingests
    updated versions of existing documents automatically.

    Args:
        file_path (str): Absolute or relative path to the document.
        client_id (str): Unique identifier of the uploading client.

    Returns:
        dict: Ingestion result containing:
            {
                "doc_id": str,
                "filename": str,
                "chunk_count": int,
                "status": "created" | "updated" | "duplicate",
                "metadata": {
                    "filename": str,
                    "original_name": str,
                    "file_type": str,
                    "size_bytes": int,
                    "client_id": str,
                    "upload_date": str,
                    "file_hash": str,
                    "doc_id": str,
                }
            }

    Raises:
        ValueError: If file validation fails.
        RuntimeError: If any stage of the pipeline fails.
                      Cleanup is performed before raising.
    """

    # --- SETUP ---
    file_path_obj = Path(file_path)
    metadata_path = None
    doc_id = None
    status = "created"
    result = {
        "doc_id": doc_id,
        "filename": None,
        "chunk_count": None,
        "status": status
    }

    try:
        is_valid, warn = validate_file(file_path=file_path_obj)
        if not is_valid:
            raise ValueError(warn)

        file_hash = compute_file_hash(file_path_obj)

        doc_id = generate_doc_id(client_id, file_path_obj.name)
        result["doc_id"] = doc_id

        metadata_path = Path(f'metadata/{doc_id}.json')

        # --- DEDUPLICATION CHECK ---
        if metadata_path.exists():
            with open(metadata_path, "r") as j:
                meta = json.load(j)
                orig_hash = meta.get("file_hash")

            if orig_hash == file_hash:
                status = "duplicate"
                result['status'] = status
                if DEBUG:
                    print(f'{Colors.YELLOW}The file: {file_path_obj} already exists. {Colors.END}')
                return result
            
            if orig_hash != file_hash:
                if DEBUG:
                    print(f'{Colors.YELLOW}The file: {file_path_obj} updated version detected. {Colors.END}')
                
                remove_points(client, doc_id, client_id)
                status = "updated"
                result['status'] = status
            
        filename = generate_filename(client_id, file_path_obj.name)
        result["filename"] = filename

        # --- ENSURE COLLECTION EXISTS ---
        collection = get_or_create_collection(client=client)
        if DEBUG:
            print(f'{Colors.LIGHT_PURPLE} ===== COLLECTION INFO ===== \n{collection}{Colors.END}')

        # --- TEXT EXTRACTION ---
        text, page_metadata = extract_text(file_path_obj)

        # --- SAVE BASIC METADATA ---
        metadata = {
            "filename": filename,
            "original_name": file_path_obj.name,
            "file_type": file_path_obj.suffix,
            "size_bytes": file_path_obj.stat().st_size,
            "client_id": client_id,
            "upload_date": datetime.now().isoformat(),
            "file_hash": file_hash,
            "doc_id": doc_id,
            "status": status
        }

        save_metadata(metadata, metadata_path)

        # --- CHUNKING ---
        chunks = chunk_text(text)

        # --- STORE IN QDRANT ---
        chunk_count = add_points(
            client=client,
            chunks=chunks,
            doc_id=doc_id,
            client_id=client_id,
            page_metadata=page_metadata
        )
        result["chunk_count"] = chunk_count

        # --- UPDATE METADATA ---
        qdrant_meta = {
            "chunk_count": chunk_count,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_version": "v1"
        }
        update_qdrant_metadata(client, doc_id, qdrant_meta)

        metadata.update(qdrant_meta)
        save_metadata(metadata, metadata_path)

        # --- RETURN RESULT ---
        result['status'] = status
        result['metadata'] = metadata
        return result

    except Exception as e:
        # --- CLEANUP ON FAILURE ---
        # TODO: Sprint 4 — cleanup_on_failure should only delete
        # the processed copy, not the original Django upload
        # cleanup_on_failure(file_path_obj, metadata_path)
        if doc_id is not None:
            remove_points(client, doc_id, client_id)
        
        if DEBUG:
            print(f'{Colors.RED} Failed to ingest files: {e} {Colors.END}')
        
        raise RuntimeError(f'Failed to ingest files: {file_path}') from e