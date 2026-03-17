#!/bin/sh
set -eu

if [ -z "${PROM_REMOTE_WRITE_URL:-}" ]; then
  echo "PROM_REMOTE_WRITE_URL is required"
  exit 1
fi

cat >/tmp/prometheus.yml <<CFG
global:
  scrape_interval: 5s
scrape_configs:
  - job_name: self
    static_configs:
      - targets: ["localhost:9090"]
remote_write:
  - url: "${PROM_REMOTE_WRITE_URL}"
    basic_auth:
      username: "${PROM_REMOTE_WRITE_USERNAME:-}"
      password: "${PROM_REMOTE_WRITE_PASSWORD:-}"
CFG

echo "Generated /tmp/prometheus.yml for remote_write to ${PROM_REMOTE_WRITE_URL}"
exec /bin/prometheus \
  --config.file=/tmp/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.listen-address=:9090
