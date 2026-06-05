from dotenv import load_dotenv
import os
load_dotenv()

# utils/embedder.py
EMBEDDING_MODEL="jinaai/jina-embeddings-v5-text-nano"

# utils/qdrant.py
QDRANT_COLLECTION_NAME="rag-docs"
QDRANT_URL=os.getenv("QDRANT_URL")

# utils/chunker.py
CHUNK_SIZE=1024     # 4 characters = 1 token -> 2048 = 256 tokens
OVERLAP=100         # 100 = 20 tokens

GROQ_API_KEY=os.getenv("GROQ_API_KEY")

# utils/pdf.py
SUPPORTED_FORMATS = [".pdf", ".docx", ".txt", ".md"]
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB