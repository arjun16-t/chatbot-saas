import hashlib
from django.core.files.uploadedfile import UploadedFile


def compute_uploaded_file_hash(uploaded_file: UploadedFile) -> str:
    """
    Computes the SHA256 hash of a Django UploadedFile without writing
    it to disk first.

    Used for pre-ingestion deduplication checks in DocumentUploadView --
    lets the view determine duplicate/updated/new status before ever
    calling ingest() or persisting a Document row, by reading the
    in-memory or temporary upload directly via chunks().

    Mirrors rag.utils.pdf.compute_file_hash's chunked-read approach,
    but operates on an UploadedFile object rather than a filesystem
    path, since InMemoryUploadedFile has no path attribute at all.

    Args:
        uploaded_file (UploadedFile): the file object from
            request.FILES, e.g. request.FILES['file_raw'].

    Returns:
        str: hex-encoded SHA256 hash of the file's contents.
    """
    hasher = hashlib.sha256()
    for chunk in uploaded_file.chunks():
        hasher.update(chunk)
    return hasher.hexdigest()