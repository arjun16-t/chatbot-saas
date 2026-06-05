"""
utils/embedder.py

Handles text embedding for the AthenaChat RAG pipeline.
Uses sentence-transformers to generate dense vector representations
of text chunks and queries locally — no external API calls required.

Model: configured via EMBEDDING_MODEL in config.py
       default: jinaai/jina-embeddings-v5-text-nano
"""

from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL
from typing import Optional


# Module-level model instance — loaded once, reused across calls
# Avoids reloading the model on every function call (expensive)
_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    """
    Returns the singleton SentenceTransformer model instance.

    Loads the model from HuggingFace on first call and caches it
    at module level. Subsequent calls return the cached instance
    without reloading — critical for performance since model loading
    takes 2-5 seconds.

    Returns:
        SentenceTransformer: Loaded embedding model instance.
    """
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL, trust_remote_code=True)
    
    return _model


def embed_text(text: str) -> list[float]:
    """
    Generates a dense vector embedding for a single text string.

    Use this for embedding user queries at retrieval time.
    For embedding multiple chunks during ingestion, prefer
    embed_batch() which is significantly more efficient.

    Args:
        text (str): Input text to embed. Should be clean,
                    preprocessed text — no raw HTML or binary.

    Returns:
        list[float]: Dense vector of floats representing the text.
                     Dimensionality determined by EMBEDDING_MODEL.
                     e.g. jina-embeddings-v5-text-nano → 512 dims.

    Raises:
        RuntimeError: If embedding fails, wrapping original exception.

    Example:
        >>> vec = embed_text("What are your opening hours?")
        >>> print(len(vec))
        512
    """
    # TODO: call _get_model()
    # TODO: call model.encode(text, convert_to_list=True)
    # TODO: wrap in try/except, raise RuntimeError on failure
    # TODO: return vector as list[float]
    pass


def embed_batch(texts: list[str]) -> list[list[float]]:
    """
    Generates dense vector embeddings for a list of text strings
    in a single model call.

    Significantly more efficient than calling embed_text() in a loop
    — the model processes all texts in optimized batches internally,
    utilizing GPU/CPU parallelism. Always use this for chunk ingestion.

    Args:
        texts (list[str]): List of text strings to embed.
                           Typically the output of chunk_text()
                           from utils/chunker.py.

    Returns:
        list[list[float]]: List of dense vectors, one per input text.
                           Order is preserved — texts[i] → vectors[i].

    Raises:
        ValueError: If texts list is empty.
        RuntimeError: If embedding fails, wrapping original exception.

    Example:
        >>> chunks = ["FAQ answer one", "FAQ answer two"]
        >>> vecs = embed_batch(chunks)
        >>> print(len(vecs))       # number of vectors
        2
        >>> print(len(vecs[0]))    # dimensions per vector
        512
    """
    # TODO: raise ValueError if texts is empty
    # TODO: call _get_model()
    # TODO: call model.encode(texts, convert_to_list=True, show_progress_bar=True)
    # TODO: show_progress_bar=True is useful for large batches during ingestion
    # TODO: wrap in try/except, raise RuntimeError on failure
    # TODO: return list of vectors
    pass