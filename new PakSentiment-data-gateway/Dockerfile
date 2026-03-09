# Build context is the project root so we can access ../PakSentiment-scraper
FROM python:3.12-slim

# Install system deps for torch/transformers + headless Firefox (camoufox)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    libgtk-3-0 libdbus-glib-1-2 libxt6 libx11-xcb1 \
    libasound2 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libatk1.0-0 \
    libxshmfence1 libxfixes3 libxkbcommon0 && \
    rm -rf /var/lib/apt/lists/*

# Install UV package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy the local scraper dependency first
WORKDIR /deps
COPY PakSentiment-scraper/ ./PakSentiment-scraper/

# Copy the data gateway
WORKDIR /app
COPY ["new PakSentiment-data-gateway/", "./"]

# Rewrite the scraper path to point to the /deps location inside the container
RUN sed -i 's|path = "../PakSentiment-scraper"|path = "/deps/PakSentiment-scraper"|g' pyproject.toml

# Install dependencies (CPU-only PyTorch configured in pyproject.toml)
ENV UV_CACHE_DIR=/tmp/uvcache
RUN mkdir -p /tmp/uvcache && uv sync --no-dev

# Install camoufox browser binaries (required by scrapling)
RUN uv run camoufox fetch

EXPOSE 8000

ENV TOKENIZERS_PARALLELISM=false

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
