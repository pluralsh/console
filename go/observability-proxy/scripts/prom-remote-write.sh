#!/bin/sh
set -eu

if [ -z "${PROM_REMOTE_WRITE_URL:-}" ]; then
  echo "PROM_REMOTE_WRITE_URL is required"
  exit 1
fi

# Lower batch sizes to reduce remote_write request body size.
MAX_SAMPLES_PER_SEND="${PROM_REMOTE_WRITE_MAX_SAMPLES_PER_SEND:-100}"
BATCH_SEND_DEADLINE="${PROM_REMOTE_WRITE_BATCH_SEND_DEADLINE:-1s}"
MIN_SHARDS="${PROM_REMOTE_WRITE_MIN_SHARDS:-1}"
MAX_SHARDS="${PROM_REMOTE_WRITE_MAX_SHARDS:-1}"
CAPACITY="${PROM_REMOTE_WRITE_CAPACITY:-200}"

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
    queue_config:
      max_samples_per_send: ${MAX_SAMPLES_PER_SEND}
      batch_send_deadline: ${BATCH_SEND_DEADLINE}
      min_shards: ${MIN_SHARDS}
      max_shards: ${MAX_SHARDS}
      capacity: ${CAPACITY}
CFG

echo "Generated /tmp/prometheus.yml for remote_write to ${PROM_REMOTE_WRITE_URL}"
exec /bin/prometheus \
  --config.file=/tmp/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.listen-address=:9090
