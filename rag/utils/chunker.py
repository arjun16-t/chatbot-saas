"""
utils/chunker.py

Handles text chunking for the AthenaChat RAG ingestion pipeline.
Uses recursive character splitting to break large documents into
overlapping chunks suitable for embedding and vector storage.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import CHUNK_SIZE, OVERLAP


def chunk_text(text: str) -> list[str]:
    """
    Splits a large text string into overlapping chunks using
    recursive character splitting.

    Args:
        text (str): Full extracted text of a document as a single string.
                    Expected to be clean markdown or plain text output

    Returns:
        list[str]: List of text chunk strings.

    Raises:
        RuntimeError: If splitting fails for any reason, wrapping
                      the original exception for traceback clarity.

    Example:
        >>> chunks = chunk_text("Long document text here...")
        >>> print(len(chunks))
        12
        >>> print(chunks[0][:50])
        'Long document text here...'
    """
    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=OVERLAP
        )
        return splitter.split_text(text)

    except Exception as e:
        raise RuntimeError(f"Chunking failed: {e}") from e