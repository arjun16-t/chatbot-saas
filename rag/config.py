from decouple import AutoConfig
import os
from pathlib import Path
config=AutoConfig(search_path=Path(__file__).parent.parent)

# utils/embedder.py
EMBEDDING_MODEL=config("EMBEDDING_MODEL") or None
VECTOR_SIZE = 768       # must match embedding model output
MODELS_CACHE_DIR = os.path.join(os.path.dirname(__file__), "models")

# Sparse Embedding Model
SPARSE_MODEL=config("SPARSE_MODEL") or None
# utils/qdrant.py
QDRANT_COLLECTION_NAME="rag-docs"
QDRANT_URL=config("QDRANT_URL")
QDRANT_API_KEY=config("QDRANT_API_KEY") or None

# utils/chunker.py
CHUNK_SIZE=1024     # 4 characters = 1 token -> 2048 = 256 tokens
OVERLAP=100         # 100 = 20 tokens
PREFETCH_LIMIT=20

GROQ_API_KEY=config("GROQ_API_KEY")
QUERYING_MODEL=config("QUERYING_MODEL") or None

# utils/pdf.py
SUPPORTED_FORMATS = [".pdf", ".docx", ".txt", ".md"]
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

DEBUG = config('DEBUG', cast=bool)

class Colors:
    """ ANSI color codes """
    BLACK = "\033[0;30m"
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    BROWN = "\033[0;33m"
    BLUE = "\033[0;34m"
    PURPLE = "\033[0;35m"
    CYAN = "\033[0;36m"
    LIGHT_GRAY = "\033[0;37m"
    DARK_GRAY = "\033[1;30m"
    LIGHT_RED = "\033[1;31m"
    LIGHT_GREEN = "\033[1;32m"
    YELLOW = "\033[1;33m"
    LIGHT_BLUE = "\033[1;34m"
    LIGHT_PURPLE = "\033[1;35m"
    LIGHT_CYAN = "\033[1;36m"
    LIGHT_WHITE = "\033[1;37m"
    BOLD = "\033[1m"
    FAINT = "\033[2m"
    ITALIC = "\033[3m"
    UNDERLINE = "\033[4m"
    BLINK = "\033[5m"
    NEGATIVE = "\033[7m"
    CROSSED = "\033[9m"
    END = "\033[0m"

# TODO: implement client doc_id cache (dict[str, set[str]])
# populated from Postgres on client login in Sprint 5
# eliminates redundant Qdrant existence checks
# invalidate on document delete/update