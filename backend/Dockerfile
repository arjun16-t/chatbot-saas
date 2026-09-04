# ==========================================
# STAGE 1: Builder
# Purpose: Create the virtual environment and install dependencies using uv.
# ==========================================
FROM ghcr.io/astral-sh/uv:python3.12-trixie-slim AS builder

# UV_COMPILE_BYTECODE compiles .py files to .pyc for faster startup
# UV_LINK_MODE=copy ensures packages are physically copied into the .venv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Copy only dependency files first to cache this layer if dependencies haven't changed
COPY pyproject.toml uv.lock* ./

# Mount a cache for uv and install dependencies (excluding the project source itself)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project

# Copy your application source code
COPY backend/ ./backend/
COPY rag/ ./rag/
COPY widget/ ./widget/

# Sync again to install the project source into the environment
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

RUN --mount=type=cache,target=/root/.cache/uv \
    EMBEDDING_MODEL=jinaai/jina-embeddings-v5-text-nano \
    SPARSE_MODEL=Qdrant/bm42-all-minilm-l6-v2-attentions \
    QDRANT_URL=http://localhost:6333 \
    QUERYING_MODEL=llama-3.3-70b-versatile \
    DEBUG=False \
    uv run python -c "from rag.utils.embedder import _get_model, _get_sparse_model; _get_model(); _get_sparse_model()"


# ==========================================
# STAGE 2: Runtime
# Purpose: Run the application in a minimal image without the uv toolchain.
# ==========================================
FROM python:3.12-slim-trixie

WORKDIR /app

# Define variables for a non-root user
ARG APP_UID=1000
ARG APP_GID=1000

# Create a dedicated group and user for security, and set permissions
RUN groupadd -g "${APP_GID}" docker-app \
    && useradd --create-home --no-log-init -u "${APP_UID}" -g "${APP_GID}" docker-app \
    && chown docker-app:docker-app -R /app

# Disable bytecode generation (already done by uv in builder) and buffering
# Add the virtual environment created in Stage 1 directly to the system PATH
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# Copy the fully built /app directory (including the .venv) from the builder stage
COPY --from=builder --chown=docker-app:docker-app /app /app

RUN mkdir -p /app/backend/media /app/backend/staticfiles && \
    chown docker-app:docker-app /app/backend/media /app/backend/staticfiles

# Switch to the secure non-root user
USER docker-app

# Expose the Django server port
EXPOSE 8000

# Run Django directly using the python executable from the PATH-injected .venv
CMD ["gunicorn", "config.wsgi:application", "--chdir", "backend", "--bind", "0.0.0.0:8000", "--workers", "2"]