FROM debian:12-slim

RUN groupadd -g 10001 steampipe && \
    useradd -u 10001 -g steampipe -s /bin/bash -m steampipe

WORKDIR /workspace

ADD "https://steampipe.io/install/steampipe.sh" /workspace/steampipe.sh
ADD "https://steampipe.io/install/sqlite.sh" /workspace/sqlite.sh

ENV TERM=xterm-256color \
    STEAMPIPE_UPDATE_CHECK=false \
    PATH="/home/steampipe/.steampipe/bin:${PATH}"

RUN apt-get update && \
    apt-get install -y --no-install-recommends bash curl ca-certificates sqlite3 && \
    chmod +x /workspace/steampipe.sh /workspace/sqlite.sh && \
    /workspace/steampipe.sh && \
    /workspace/sqlite.sh aws latest /workspace && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    chown -R steampipe:steampipe /workspace

USER steampipe

RUN steampipe plugin install aws

#RUN sqlite ".load ./steampipe_sqlite_extension_github.so"

CMD ["steampipe", "service", "start", "--install-dir", "--show-password", "/home/steampipe/.steampipe"]