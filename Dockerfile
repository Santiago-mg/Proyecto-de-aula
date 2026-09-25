FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN echo "root:password" | chpasswd

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    git \
    docker-cli \
    postgresql \
    postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home

CMD ["bash"]

