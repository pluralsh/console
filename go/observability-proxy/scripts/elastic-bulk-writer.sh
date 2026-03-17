#!/bin/sh
set -eu

if [ -z "${ELASTIC_PROXY_BULK_URL:-}" ]; then
  echo "ELASTIC_PROXY_BULK_URL is required"
  exit 1
fi

INDEX="${ELASTIC_WRITE_INDEX:-obs_proxy_smoketest}"
INTERVAL_SECONDS="${ELASTIC_WRITE_INTERVAL_SECONDS:-5}"
BATCH_SIZE="${ELASTIC_WRITE_BATCH_SIZE:-10}"

if [ "${BATCH_SIZE}" -le 0 ]; then
  echo "ELASTIC_WRITE_BATCH_SIZE must be > 0"
  exit 1
fi

echo "Starting elastic bulk writer"
echo "  bulk url: ${ELASTIC_PROXY_BULK_URL}"
echo "  index: ${INDEX}"
echo "  interval seconds: ${INTERVAL_SECONDS}"
echo "  batch size: ${BATCH_SIZE}"

while true; do
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  req_id="$(date +%s)"

  payload_file="/tmp/elastic-bulk.ndjson"
  : >"${payload_file}"

  i=1
  while [ "${i}" -le "${BATCH_SIZE}" ]; do
    printf '{"index":{"_index":"%s"}}\n' "${INDEX}" >>"${payload_file}"
    printf '{"source":"observability-proxy-elastic-writer","request_id":"%s","batch_item":%s,"@timestamp":"%s","message":"elastic bulk write smoke payload"}\n' "${req_id}" "${i}" "${now}" >>"${payload_file}"
    i=$((i + 1))
  done

  auth_args=""
  if [ -n "${ELASTIC_WRITE_USERNAME:-}" ] || [ -n "${ELASTIC_WRITE_PASSWORD:-}" ]; then
    auth_args="-u ${ELASTIC_WRITE_USERNAME:-}:${ELASTIC_WRITE_PASSWORD:-}"
  fi

  # shellcheck disable=SC2086
  http_code="$(
    curl -sS \
      -o /tmp/elastic-bulk-response.json \
      -w "%{http_code}" \
      ${auth_args} \
      -H "Content-Type: application/x-ndjson" \
      --data-binary @"${payload_file}" \
      "${ELASTIC_PROXY_BULK_URL}"
  )"

  if [ "${http_code}" -lt 200 ] || [ "${http_code}" -ge 300 ]; then
    echo "bulk request failed with status=${http_code}"
    cat /tmp/elastic-bulk-response.json || true
  elif grep -q '"errors":true' /tmp/elastic-bulk-response.json; then
    echo "bulk request returned partial errors"
    cat /tmp/elastic-bulk-response.json || true
  else
    echo "bulk write succeeded status=${http_code} docs=${BATCH_SIZE}"
  fi

  sleep "${INTERVAL_SECONDS}"
done
