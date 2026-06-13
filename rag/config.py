from dotenv import load_dotenv
import os
load_dotenv()

# utils/embedder.py
EMBEDDING_MODEL="jinaai/jina-embeddings-v5-text-nano"
VECTOR_SIZE = 768       # must match embedding model output
MODELS_CACHE_DIR = os.path.join(os.path.dirname(__file__), "models")

# Sparse Embedding Model
SPARSE_MODEL="Qdrant/bm42-all-minilm-l6-v2-attentions"
# utils/qdrant.py
QDRANT_COLLECTION_NAME="rag-docs"
QDRANT_URL=os.getenv("QDRANT_URL")
QDRANT_API_KEY=os.getenv("QDRANT_API_KEY") or None

# utils/chunker.py
CHUNK_SIZE=1024     # 4 characters = 1 token -> 2048 = 256 tokens
OVERLAP=100         # 100 = 20 tokens
PREFETCH_LIMIT=20

GROQ_API_KEY=os.getenv("GROQ_API_KEY")
QUERYING_MODEL='llama-3.3-70b-versatile'

# utils/pdf.py
SUPPORTED_FORMATS = [".pdf", ".docx", ".txt", ".md"]
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

DEBUG = True

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