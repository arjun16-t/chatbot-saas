"""
utils/qdrant.py

Handles all Qdrant vector database operations for the AthenaChat
RAG pipeline. Responsible for collection management, point ingestion,
retrieval, and metadata updates.

Multi-tenancy strategy: shared collection with client_id payload filtering.
Each client's chunks are isolated via client_id field in point payloads.

# TODO (future): Implement Qdrant tiered multi-tenancy for high-traffic
#                premium clients when traffic patterns warrant it.

# TODO: jina-embeddings-v5-text-nano is CC BY-NC 4.0 (non-commercial)
# Switch to bge-small-en-v1.5 (Apache 2.0) before commercial launch
# or obtain commercial license from Jina AI
"""

from qdrant_client import QdrantClient, models
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
    Filter,
    FilterSelector,
    FieldCondition,
    MatchValue,
    PayloadSchemaType,
    SparseVectorParams,
    HnswConfigDiff
)
from utils.embedder import embed_batch, embed_text
from config import QDRANT_COLLECTION_NAME, EMBEDDING_MODEL, VECTOR_SIZE, DEBUG, Colors
from typing import Optional
import uuid


def get_or_create_collection(client: QdrantClient) -> None:
    """
    Ensures the Qdrant collection exists, creating it if necessary.

    Creates the collection with cosine similarity metric and correct
    vector dimensions. Also creates a payload index on client_id
    for fast multi-tenant filtering.

    Should be called once at application startup or before ingestion.
    Safe to call multiple times — will not overwrite existing collection.

    Args:
        client (QdrantClient): Active Qdrant client instance.

    Returns:
        None

    Raises:
        RuntimeError: If collection creation or index creation fails.
    """
    try:
        if not client.collection_exists(QDRANT_COLLECTION_NAME):
            client.create_collection(
                collection_name=QDRANT_COLLECTION_NAME,
                vectors_config={
                    "dense": VectorParams(
                        size=VECTOR_SIZE,
                        distance=Distance.COSINE
                    )
                },
                sparse_vectors_config={
                    "sparse": SparseVectorParams()
                },
                hnsw_config=HnswConfigDiff(
                    m=16,
                    ef_construct=100
                )
            )
        
            client.create_payload_index(
                collection_name=QDRANT_COLLECTION_NAME,
                field_name="client_id",
                field_schema=PayloadSchemaType.KEYWORD
            )
            client.create_payload_index(
                collection_name=QDRANT_COLLECTION_NAME,
                field_name="doc_id",
                field_schema=PayloadSchemaType.KEYWORD
            )

            if DEBUG:
                print(f"{Colors.BLUE} Successfully Created the Collection: {QDRANT_COLLECTION_NAME} {Colors.END}")
    except Exception as e:
        if DEBUG:
            print(f"{Colors.RED} Failed to create collection {Colors.END}")
        raise RuntimeError(f"Failed to create collection: {e}") from e

def delete_collection(client: QdrantClient) -> None:
    """
    Permanently deletes the entire Qdrant collection and all its points.

    DESTRUCTIVE OPERATION — cannot be undone. Requires double
    confirmation via terminal prompt before executing.

    Intended for development use only. In production, use
    remove_points() to delete per-document data instead.

    Args:
        client (QdrantClient): Active Qdrant client instance.

    Returns:
        None

    Raises:
        RuntimeError: If deletion fails.
    """
    print(f"{Colors.RED} Deleting the collection is a destructive operation and cannot be recovered. {Colors.END}")
    response = input(f"{Colors.YELLOW}Are you sure you want to proceed? (y/N): {Colors.END}")
    if response.strip().lower() != 'y':
        print(f"{Colors.GREEN} Aborted! {Colors.END}")
        return
    
    name = input(f"Type collection name to confirm: ").strip()
    if QDRANT_COLLECTION_NAME != name:
        print(f"{Colors.RED} Incorrect Collection Name. Aborted! {Colors.END}")
        return
    
    try:
        if not client.collection_exists(QDRANT_COLLECTION_NAME):
            print(f"{Colors.YELLOW}Collection '{QDRANT_COLLECTION_NAME}' does not exist.{Colors.END}")
            return
        
        client.delete_collection(QDRANT_COLLECTION_NAME)

        if DEBUG:
            print(f"{Colors.GREEN} Successfully Deleted Collection: {QDRANT_COLLECTION_NAME} {Colors.END}")
    except Exception as e:
        if DEBUG:
            print(f"{Colors.RED} Failed to Delete Collection: {QDRANT_COLLECTION_NAME} {Colors.END}")
        raise RuntimeError(f"Failed to Delete Collection '{QDRANT_COLLECTION_NAME}': {e} ") from e

def add_points(
    client: QdrantClient,
    chunks: list[str],
    doc_id: str,
    client_id: str,
    page_metadata: Optional[list[dict]] = None
) -> int:
    """
    Embeds text chunks and upserts them as points into Qdrant.

    Each chunk becomes one point with:
        - A unique UUID as point ID
        - Dense vector from embed_batch()
        - Payload containing chunk_text, doc_id, client_id,
          chunk_index, and approximate page number if available

    Uses upsert (not insert) to safely handle re-ingestion of
    updated documents without duplicate points.

    Args:
        client (QdrantClient): Active Qdrant client instance.
        chunks (list[str]): List of text chunks from chunk_text().
        doc_id (str): Unique identifier for the source document.
        client_id (str): Unique identifier for the client/tenant.
        page_metadata (Optional[list[dict]]): Page boundary info from
            extract_text(). Used to approximate page number per chunk.
            Pass None for non-PDF files.

    Returns:
        int: Number of points successfully added to the collection.

    Raises:
        ValueError: If chunks list is empty.
        RuntimeError: If embedding or upsert fails.

    Example:
        >>> count = add_points(client, chunks, "doc_abc", "client_123")
        >>> print(count)
        42
    """
    if not chunks:
        raise ValueError("Given chunks are empty - Cannot be empty")
    try:
        embed = embed_batch(chunks)
        points = []
        for i, (chunk, vector) in enumerate(zip(chunks, embed)):
            points.append(PointStruct(
                    id=str(uuid.uuid4()),
                    vector={"dense": vector},
                    payload={
                        "chunk_text": chunk,
                        "doc_id": doc_id,
                        "client_id": client_id,
                        "chunk_index": i,
                        "page": _get_page_for_chunk(i, chunks[i], page_metadata)
                    }
                )
            )
        
        client.upsert(
            collection_name=QDRANT_COLLECTION_NAME,
            points=points
        )

        return len(chunks)
    except Exception as e:
        if DEBUG:
            print(f'{Colors.RED}Failed to insert points. {Colors.END}')
        raise RuntimeError(f"Could not insert points: {e}") from e

def remove_point(client: QdrantClient, point_id: str) -> None:
    """
    Removes a single point from the collection by its ID.

    Use this for surgical removal of a specific chunk.
    For removing all chunks of a document, use remove_points().

    Args:
        client (QdrantClient): Active Qdrant client instance.
        point_id (str): UUID of the point to remove.

    Returns:
        None

    Raises:
        RuntimeError: If deletion fails.
    """
    try:
        client.delete(
            collection_name=QDRANT_COLLECTION_NAME,
            points_selector=[point_id]
        )
        if DEBUG:
            print(f"{Colors.BLUE} Successfully deleted the point: {point_id} {Colors.END}")
    
    except Exception as e:
        if DEBUG:
            print(f"{Colors.RED} Failed to delete the point: {point_id} {Colors.END}")
        
        raise RuntimeError(f"Failed to delete: {point_id}") from e


def remove_points(client: QdrantClient, doc_id: str) -> None:
    """
    Removes all points belonging to a specific document.

    Used when a client re-uploads an updated version of a document —
    all existing chunks for that doc_id are deleted before re-ingestion.

    Args:
        client (QdrantClient): Active Qdrant client instance.
        doc_id (str): Document identifier whose points should be removed.

    Returns:
        None

    Raises:
        RuntimeError: If deletion fails.
    """
    try:
        client.delete(
            collection_name=QDRANT_COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[
                        FieldCondition(
                            key="doc_id",
                            match=MatchValue(value=doc_id)
                        ),
                    ],
                )
            ),
        )

        if DEBUG:
            print(f"{Colors.BLUE} Successfully deleted all points for document: {doc_id} {Colors.END}")
    
    except Exception as e:
        if DEBUG:
            print(f"{Colors.RED} Failed to delete the point. {Colors.END}")
        
        raise RuntimeError(f"Failed to delete points for doc_id '{doc_id}': {e}") from e


def query_collection(
    client: QdrantClient,
    query: str,
    client_id: str,
    top_k: int = 5
) -> list[dict]:
    """
    Searches the collection for chunks semantically similar to the query,
    filtered to a specific client's documents only.

    Pipeline:
        1. Embed the query string using embed_text()
        2. Apply client_id payload filter for multi-tenancy
        3. Run cosine similarity search
        4. Return top_k results with text and relevance score

    Args:
        client (QdrantClient): Active Qdrant client instance.
        query (str): User's natural language question.
        client_id (str): Client identifier to scope the search.
        top_k (int): Number of top results to return. Default 5.

    Returns:
        list[dict]: List of result dicts, each containing:
            {
                "chunk_text": str,
                "score": float,      # cosine similarity 0-1
                "doc_id": str,
                "page": int,
                "chunk_index": int
            }
        Sorted by score descending.

    Raises:
        RuntimeError: If embedding or search fails.

    Example:
        >>> results = query_collection(client, "opening hours", "client_123")
        >>> print(results[0]["chunk_text"])
        "We are open Monday to Friday, 9am to 6pm..."
    """
    query_vector = embed_text(query)
    client_filter = FilterSelector(
        filter=Filter(
            must=[
                FieldCondition(
                    key="client_id",
                    match=MatchValue(value=client_id)
                )
            ]
        )
    )

    client.query_points(
        collection_name=QDRANT_COLLECTION_NAME,
        prefetch=[
            models.Prefetch(
                query=models.SparseVector
            )
        ]
    )
    # TODO: build and return list of result dicts from search results
    #       result.payload["chunk_text"], result.score, etc.
    # TODO: wrap in try/except, raise RuntimeError on failure
    pass


def update_metadata(
    client: QdrantClient,
    doc_id: str,
    metadata: dict
) -> None:
    """
    Updates payload fields on all points belonging to a document.

    Called after successful ingestion to enrich point payloads with:
        - chunk_count: total chunks generated for this document
        - embedding_model: model name used (from config.py)
        - embedding_version: version tag for tracking model changes

    Args:
        client (QdrantClient): Active Qdrant client instance.
        doc_id (str): Document identifier whose points to update.
        metadata (dict): Key-value pairs to set on matching points.
                         e.g. {"chunk_count": 42, "embedding_model": "..."}

    Returns:
        None

    Raises:
        RuntimeError: If payload update fails.
    """
    # TODO: build Filter matching doc_id
    # TODO: client.set_payload(
    #           collection_name=QDRANT_COLLECTION_NAME,
    #           payload=metadata,
    #           points=Filter(...)
    #       )
    # TODO: wrap in try/except, raise RuntimeError on failure
    pass


def get_indexes(client: QdrantClient) -> list:
    """
    Returns all payload indexes defined on the collection.

    Dev utility — use this to verify indexes exist on client_id
    and doc_id fields after collection creation.

    Args:
        client (QdrantClient): Active Qdrant client instance.

    Returns:
        list: List of payload index definitions from Qdrant.

    Raises:
        RuntimeError: If fetching collection info fails.
    """
    # TODO: info = client.get_collection(QDRANT_COLLECTION_NAME)
    # TODO: return info.payload_schema (contains index definitions)
    # TODO: print each index name and type for readability
    # TODO: wrap in try/except, raise RuntimeError on failure
    pass


def _get_page_for_chunk(
    chunk_index: int,
    chunk_text: str,
    page_metadata: Optional[list[dict]]
) -> int:
    """
    Approximates the page number for a given chunk using character
    position metadata from extract_text().

    Private helper for add_points(). Falls back to page 1 if
    page_metadata is unavailable (non-PDF files).

    Args:
        chunk_index (int): Index of the chunk in the chunks list.
        chunk_text (str): Text content of the chunk.
        page_metadata (Optional[list[dict]]): Page boundary info
            from extract_text(). Each dict has "page", "char_start",
            "char_end" keys.

    Returns:
        int: Best-guess page number (1-indexed). Returns 1 if
             page_metadata is None or empty.
    """
    # TODO: if page_metadata is None or empty → return 1
    # TODO: use chunk_index or char position to find matching page
    #       hint: find the page where char_start <= chunk position <= char_end
    # TODO: return page number
    pass