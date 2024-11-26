FROM python:3.11-slim-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y curl jq wget git \
    build-essential \
    gcc \
    g++ \
    make \
    cmake \
    git \
    perl \
    golang \
    libssl-dev \
    pkg-config \
    llvm-dev \
    libclang-dev \
    clang \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED True

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

# Add Cargo to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

COPY requirements-docker.txt /app

RUN pip install -qq -r requirements-docker.txt
EXPOSE 8080

COPY autogpt/ /app/autogpt
COPY gunicorn.conf.py /app
COPY credentials/ /app/credentials

ENV PORT 8080
ENV HOST 0.0.0.0

CMD ["gunicorn" , "-c", "gunicorn.conf.py", "autogpt.api:app"]
