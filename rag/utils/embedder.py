"""
utils/embedder.py

Handles text embedding for the AthenaChat RAG pipeline.
Uses sentence-transformers to generate dense vector representations
of text chunks and queries locally — no external API calls required.

Model: configured via EMBEDDING_MODEL in config.py
       default: jinaai/jina-embeddings-v5-text-nano
"""

from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL, DEBUG, Colors
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
        try:
            _model = SentenceTransformer(EMBEDDING_MODEL, trust_remote_code=True)

            if DEBUG:
                print(f"{Colors.BLUE} Successfully Loaded: {_model} {Colors.END}")
            
        except Exception as e:
            if DEBUG:
                print(f"{Colors.RED} Failed to Load: {_model} {Colors.END}")
            raise RuntimeError(f"Failed to load model '{EMBEDDING_MODEL}': {e}") from e
    
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
    """
    model: SentenceTransformer = _get_model()
    try:
        embed = model.encode(text, prompt_name="query", convert_to_list=True)

        if DEBUG:
            print(f"{Colors.BLUE} Successfully Embedded: {embed[:100]} {Colors.END}")
        
        return embed
    
    except Exception as e:
        if DEBUG:
            print(f"{Colors.RED} Error Occurred: {e} {Colors.END}")
        raise RuntimeError(f"Failed to embed: {e}")


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
    if not texts:
        raise ValueError("Requires list of str texts")
    model: SentenceTransformer = _get_model()

    try:
        embeds = model.encode(
            texts, prompt_name="passage", 
            show_progress_bar=True, 
            convert_to_list=True
        )

        if DEBUG:
            print(f"{Colors.BLUE} Successfully Embedded the texts. {Colors.END}")
        
        return embeds
    
    except Exception as e:
        if DEBUG:
            print(f"{Colors.RED} Error Occurred: {e} {Colors.END}")
        raise RuntimeError(f"Failed to embed: {e}")