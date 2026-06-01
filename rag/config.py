from dotenv import load_dotenv
import os
load_dotenv()

EMBEDDING_MODEL="jinaai/jina-embeddings-v5-text-nano"
QDRANT_COLLECTION_NAME="rag-docs"
CHUNK_SIZE=512
OVERLAP=50
QDRANT_URL=os.getenv("QDRANT_URL")
GROQ_API_KEY=os.getenv("GROQ_API_KEY")