<p align="center">
  <img alt="AthenaChat Logo" src="assets/AthenaBot.png" width="350px">
</p>

# 🤖 AthenaChat — RAG-Powered Chatbot as a Service

> Embed an AI assistant trained on your own documents into any website in minutes.

---

## 📌 Overview

AthenaChat lets businesses add a smart, context-aware chatbot to their website by pasting a single script tag. The chatbot is powered by Retrieval-Augmented Generation (RAG) — it answers questions strictly from the business's own documents (FAQs, product info, service details), not general internet knowledge.

Every client's documents and conversations are fully isolated from every other client's, enforced at the data layer rather than just in application logic.

---

## ✨ Features

**Live today:**
- 🔐 JWT-based client authentication with hashed, one-time-shown API keys
- 📄 Document upload with validation, deduplication, and automatic re-indexing on updates
- 🔍 Hybrid RAG retrieval (dense + sparse embeddings) for grounded, accurate answers
- 🛡️ Multi-tenant isolation enforced at the vector-store query layer, not just the API layer
- 🧠 Prompt-injection detection on incoming questions before they reach the LLM
- 📋 Unresolved-query tracking, so clients can see what their chatbot couldn't answer

**Planned:**
- 🌐 One-line embed widget (`<script>` tag) for any website
- 📊 Client dashboard for document management and analytics
- ⚡ Async ingestion via Celery, plus rate limiting
- 🚀 Freemium model with usage-based limits

---

## 🏗️ Architecture

```
Client Website
     │
 [Script Tag]
     │
 JS Widget (chat bubble)
     │
 Django REST API  ──── JWT Auth
     │
 RAG Pipeline (rag/)
 ┌───┴────────┐
Qdrant       Groq LLM
(hybrid       (Llama 3.3
 search,       70B)
 client-
 filtered)
     │
 PostgreSQL
(clients, documents, unresolved queries)
```

The RAG pipeline (`rag/`) is a standalone Python package, independent of Django, so it can be reused across other Athena products. The Django backend imports it directly rather than duplicating any retrieval or ingestion logic.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django + Django REST Framework |
| Auth | JWT (`djangorestframework-simplejwt`) |
| Vector DB | Qdrant — hybrid dense + sparse search, payload-filtered per client |
| Dense Embeddings | `jina-embeddings-v5-text-nano` |
| Sparse Embeddings | FastEmbed SPLADE |
| LLM Inference | Groq API (Llama 3.3 70B) |
| Relational DB | PostgreSQL |
| Task Queue | Celery + Redis *(planned)* |
| Frontend Widget | Vanilla JS *(planned)* |
| Deployment | Railway / Render |

---

## 📁 Project Structure

```
chatbot-saas/
├── assets/                # images and media
├── rag/                   # standalone RAG pipeline, importable as a package
│   ├── ingest.py           # validate → dedupe → extract → chunk → embed → store
│   ├── query.py             # embed → hybrid search → prompt → Groq → answer
│   ├── config.py
│   ├── test_docs/
│   └── utils/
├── backend/                # Django project
│   ├── core/                # Client model, JWT auth (register/login/refresh)
│   ├── chatbot/              # Chat API, unresolved-query tracking
│   ├── documents/            # Document upload + ingestion API
│   ├── utils/                 # shared logging
│   └── config/                 # settings, URLs
├── widget/                 # embeddable JS chat bubble (planned)
├── dashboard/               # client-facing React dashboard (planned)
├── docs/                    # architecture notes
├── .env.example
└── README.md
```

---

## 🚀 Getting Started (Local Setup)

> ⚠️ Still in active development — expect rough edges.

### Prerequisites
- Python 3.10+
- Docker (for Qdrant)
- PostgreSQL

### 1. Clone the repo
```bash
git clone https://github.com/arjun16-t/chatbot-saas.git
cd chatbot-saas
```

### 2. Set up environment
A single `.env` file at the project root is shared by both the `rag/` pipeline and the Django backend:
```bash
cp .env.example .env
# fill in your API keys and database credentials
```

### 3. Start Qdrant locally
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 4. Set up PostgreSQL
Create a database matching the `DB_NAME` in your `.env`.

### 5. Install dependencies and run migrations
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
```

### 6. Run the Django backend
```bash
python manage.py runserver
```

### 7. Try the API
```bash
# Register a client
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpassword"}'

# Log in to get a JWT
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpassword"}'

# Upload a document (use the access token from login)
curl -X POST http://127.0.0.1:8000/api/documents/upload/ \
  -H "Authorization: Bearer <access_token>" \
  -F "file_raw=@your_document.pdf"

# Ask a question
curl -X POST http://127.0.0.1:8000/api/chat/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "What does this document say about X?"}'
```

### Running just the RAG pipeline (without Django)
For experimenting with retrieval logic in isolation:
```bash
cd rag
python -c "from ingest import ingest; print(ingest('test_docs/sebi.pdf', 'test_client'))"
python -c "from query import query; print(query('your question', 'test_client'))"
```

---

## 🗺️ Roadmap

- [x] Standalone RAG pipeline — hybrid retrieval, chunking, deduplication
- [x] Django REST API with JWT auth and multi-tenant isolation
- [x] Document upload and ingestion endpoint
- [x] Chat endpoint with unresolved-query tracking
- [x] Project-wise API endpoints per client
- [ ] Async document processing (Celery + Redis)
- [ ] API rate limiting
- [ ] Document management endpoints (list, retrieve, delete)
- [ ] Client dashboard (React)
- [ ] Embeddable JS widget
- [ ] Production deployment
- [ ] First clients

---

## 📄 License

Apache License 2.0 — see [LICENSE](LICENSE) for details.

---

> Built by [Arjun](https://github.com/arjun16-t) · Open to feedback and contributions
