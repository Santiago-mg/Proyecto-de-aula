FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN echo "root:password" | chpasswd

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    git \
    docker-cli \
    unzip \
    postgresql \
    postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSLo /tmp/sonar-scanner.zip https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-6.1.0.4477-linux-x64.zip \
    && unzip /tmp/sonar-scanner.zip -d /opt \
    && ln -s /opt/sonar-scanner-6.1.0.4477-linux-x64/bin/sonar-scanner /usr/local/bin/sonar-scanner \
    && rm /tmp/sonar-scanner.zip

WORKDIR /home

CMD ["bash"]

