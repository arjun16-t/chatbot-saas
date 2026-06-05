"""
utils/pdf.py

Handles file validation, text extraction, metadata management,
and cleanup for the AthenaChat RAG ingestion pipeline.
"""

import json
import hashlib
import re
import uuid
from pathlib import Path
from datetime import datetime
from typing import Tuple, Optional

import pymupdf4llm
from docx import Document

SUPPORTED_FORMATS = [".pdf", ".docx", ".txt", ".md"]
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


def validate_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """
    Validates a file before processing it in the ingestion pipeline.

    Checks:
        - File exists on disk
        - File extension is supported (.pdf, .docx, .txt, .md)
        - File size is within the 10MB limit

    Args:
        file_path (str): Absolute or relative path to the file.

    Returns:
        Tuple[bool, Optional[str]]:
            - (True, None) if the file is valid
            - (False, error_message) if validation fails
    """
    file = Path(file_path)

    if not file.exists():
        return (False, "File Not Found")

    if file.suffix not in SUPPORTED_FORMATS:
        return (False, f"Unsupported format '{file.suffix}'. Accepted: {SUPPORTED_FORMATS}")

    if file.stat().st_size > MAX_FILE_SIZE_BYTES:
        return (False, f"File Size exceeds the limit ({MAX_FILE_SIZE_BYTES // 1024 // 1024} MB)")

    return (True, None)


def generate_filename(client_id: str, original_filename: str) -> str:
    """
    Generates a unique filename for storing the uploaded file.

    Format: {client_id}_{uuid4}_{original_filename}
    Example: "client123_550e8400-e29b_report.pdf"

    Args:
        client_id (str): Unique identifier of the client uploading the file.
        original_filename (str): Original name of the uploaded file.

    Returns:
        str: A unique filename string safe for filesystem storage.
    """
    uid = uuid.uuid4()
    sanitized = re.sub(r'[^\w\-.]', '_', original_filename.strip())


    return f"{client_id}_{uid}_{sanitized}"


def compute_file_hash(file_path: str) -> str:
    """
    Computes the SHA256 hash of a file's contents.

    Used for deduplication — same hash means identical file content,
    regardless of filename. Read file in chunks to handle large files
    without loading entire file into memory.

    Args:
        file_path (str): Path to the file to hash.

    Returns:
        str: Hexadecimal SHA256 hash string of the file contents.
    """
    file_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            file_hash.update(chunk)
    
    return file_hash.hexdigest()


def extract_text(file_path: str) -> Tuple[str, list]:
    """
    Extracts text content from a file and returns it as a single string.

    Routes to the correct extractor based on file extension:
        - .pdf  → pymupdf4llm (returns markdown with page metadata)
        - .docx → python-docx (iterates paragraphs)
        - .txt  → direct read
        - .md   → direct read

    Args:
        file_path (str): Path to the file to extract text from.

    Returns:
        Tuple[str, list]:
            - Full extracted text as a single markdown/plain string
            - List of dicts with page metadata [{"page": 1, "char_start": 0, "char_end": 512}, ...]
              (best effort — .txt and .md will return empty list)

    Raises:
        ValueError: If file format is unsupported.
        RuntimeError: If extraction fails.
    """
    file = Path(file_path)
    extension = file.suffix

    if extension == '.pdf':
        return _extract_pdf(file_path)
    
    elif extension == '.docx':
        return _extract_docx(file_path)

    elif extension == '.txt' or extension == '.md':
        return _extract_txt_md(file_path)
    
    else:
        raise ValueError(f"Unsupported format '{extension}'. Accepted: {SUPPORTED_FORMATS}")


def save_metadata(metadata: dict, storage_path: str) -> None:
    """
    Saves document metadata as a JSON sidecar file.

    Metadata fields expected:
        - filename (str): Generated unique filename
        - original_name (str): Original uploaded filename
        - file_type (str): File extension e.g. ".pdf"
        - size_bytes (int): File size in bytes
        - client_id (str): Client identifier
        - upload_date (str): ISO format timestamp
        - file_hash (str): SHA256 hash of file contents

    Will be extended in utils/qdrant.py with:
        - chunk_count, embedding_model, embedding_version

    Args:
        metadata (dict): Dictionary of metadata fields.
        storage_path (str): Path where the JSON file should be saved.

    Returns:
        None
    """
    obj = Path(storage_path)
    obj.parent.mkdir(parents=True, exist_ok=True)
    
    metadata["saved_at"] = datetime.now().isoformat()

    with open(storage_path, "w") as f:
        json.dump(metadata, f, indent=2)


def cleanup_on_failure(file_path: Optional[str], metadata_path: Optional[str]) -> None:
    """
    Cleans up partially processed files in case of ingestion failure.

    Should be called inside except blocks in ingest.py to ensure
    no orphaned files or incomplete metadata are left on disk.

    Args:
        file_path (Optional[str]): Path to the uploaded file to delete. Pass None to skip.
        metadata_path (Optional[str]): Path to the metadata JSON to delete. Pass None to skip.

    Returns:
        None
    """
    if file_path is not None:
        Path(file_path).unlink(missing_ok=True)
        print(f"Removed File: {file_path}")
    
    if metadata_path is not None:
        Path(metadata_path).unlink(missing_ok=True)
        print(f"Removed metadata: {metadata_path}")


def _extract_pdf(file_path: str) -> Tuple[str, list]:
    try:
        chunks = pymupdf4llm.to_markdown(file_path, page_chunks=True)

        full_text = ""
        page_metadata:list[dict] = []

        for chunk in chunks:
            page_metadata.append({
                "page": chunk.get("page", 0) + 1,  # 0-indexed → 1-indexed
                "char_start": len(full_text),       # capture BEFORE appending
                "char_end": len(full_text) + len(chunk['text'])
            })
            full_text += chunk['text'] + "\n\n"

        return (full_text.strip(), page_metadata)
    except Exception as e:
        raise RuntimeError(f"Extraction failed: {e}") from e

def _extract_docx(file_path: str) -> Tuple[str, list]:
    try:
        doc = Document(file_path)

        full_text = ""
        for para in doc.paragraphs:
            full_text += para.text + "\n\n"

        return (full_text.strip(), [])
    except Exception as e:
        raise RuntimeError(f"Extraction failed: {e}") from e

def _extract_txt_md(file_path: str) -> Tuple[str, list]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            full_text = f.read()
        
        return (full_text, [])
    
    except Exception as e:
        raise RuntimeError(f"Extraction failed: {e}") from e