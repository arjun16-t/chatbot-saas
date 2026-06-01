<p align="center">
  <img alt="Chunky Logo" src="assets/AthenaBot.png" width="350px">
</p>

# 🤖 AthenaBot — RAG-Powered Chatbot as a Service

> Embed an AI assistant trained on your own documents into any website in minutes.

---

## 📌 Overview

ChatEmbed lets businesses add a smart, context-aware chatbot to their website by pasting a single script tag. The chatbot is powered by Retrieval-Augmented Generation (RAG) — meaning it answers questions based strictly on the business's own documents (FAQs, product info, service details), not general internet knowledge.

---

## ✨ Features (Planned)

- 📄 Upload your own documents (PDF, text) as the chatbot's knowledge base
- 🔍 RAG pipeline for accurate, grounded responses
- 🌐 One-line embed for any website (`<script>` tag)
- 🔐 Multi-tenant — each client's data is fully isolated
- 📊 Usage dashboard for document management and analytics
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
 Django REST API
     │
 RAG Pipeline
 ┌───┴───┐
Qdrant  Groq LLM
(vectors) (inference)
     │
 PostgreSQL
(clients, logs)
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django + Django REST Framework |
| Vector DB | Qdrant |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) |
| LLM Inference | Groq API |
| Relational DB | PostgreSQL |
| Task Queue | Celery + Redis |
| Frontend Widget | Vanilla JS |
| Deployment | Railway / Render |

---

## 📁 Project Structure

```
chatbot-saas/
├── assets/             # contains images and media
├── rag/                # Standalone RAG pipeline
│   ├── ingest.py
│   ├── query.py
│   ├── config.py
│   └── test_docs/
├── backend/              # Django project
│   ├── core/             # Auth, client management
│   ├── chatbot/          # Chat API, RAG integration
│   ├── documents/        # Upload, Celery tasks
│   └── config/           # Settings, URLs, Celery config
├── widget/               # Embeddable JS chat bubble
├── dashboard/            # Client-facing React dashboard
├── docs/                 # Architecture notes
├── .env.example
├── .env
└── README.md
```

---

## 🚀 Getting Started (Local Setup)

> ⚠️ Full setup guide coming soon. Currently in early development.

### Prerequisites
- Python 3.10+
- Docker (for Qdrant and Redis)
- PostgreSQL

### 1. Clone the repo
```bash
git clone https://github.com/arjun16-t/chatbot-saas.git
cd chatbot-saas
```

### 2. Set up environment
```bash
cp .env.example .env
# Fill in your API keys in .env
```

### 3. Start Qdrant locally
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 4. Install Python dependencies
```bash
cd rag/
pip install -r requirements.txt
```

### 5. Run the RAG pipeline
```bash
python ingest.py        # Upload a document
python query.py         # Ask a question
```

---

## 🗺️ Roadmap

- [✓] Project setup and architecture design
- [✓] Sprint 1 — Core RAG pipeline
- [ ] Sprint 2 — Chat API endpoint
- [ ] Sprint 3 — Client auth + multi-tenancy
- [ ] Sprint 4 — Document upload + Celery processing
- [ ] Sprint 5 — Client dashboard
- [ ] Sprint 6 — Embeddable JS widget
- [ ] Sprint 7 — Deployment
- [ ] Sprint 8 — Product website + first clients

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

> Built by [Arjun](https://github.com/YOUR_USERNAME) · Open to feedback and contributions after v1.0