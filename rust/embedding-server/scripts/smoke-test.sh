#!/usr/bin/env bash

set -Eeuo pipefail

IMAGE=${IMAGE:-embedding-server:local}
SERVED_MODEL_NAME=${SERVED_MODEL_NAME:-nomic-ai/nomic-embed-text-v1.5}
WAIT_SECONDS=${WAIT_SECONDS:-180}
REQUEST_TIMEOUT_SECONDS=${REQUEST_TIMEOUT_SECONDS:-120}
CURL_IMAGE=${CURL_IMAGE:-curlimages/curl:8.16.0@sha256:463eaf6072688fe96ac64fa623fe73e1dbe25d8ad6c34404a669ad3ce1f104b6}

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

container="embedding-server-smoke-$$"
network="embedding-server-smoke-$$"
single_response=$(mktemp)
batch_response=$(mktemp)

cleanup() {
	docker rm --force "$container" >/dev/null 2>&1 || true
	docker network rm "$network" >/dev/null 2>&1 || true
	rm -f "$single_response" "$batch_response"
}
trap cleanup EXIT

docker image inspect "$IMAGE" >/dev/null
docker pull "$CURL_IMAGE" >/dev/null
docker network create --internal "$network" >/dev/null
docker run --detach \
	--name "$container" \
	--network "$network" \
	--network-alias embedding-server \
	--read-only \
	--tmpfs /tmp \
	--env HF_HUB_OFFLINE=1 \
	--env TRANSFORMERS_OFFLINE=1 \
	--env HF_DATASETS_OFFLINE=1 \
	"$IMAGE" >/dev/null

ready=0
for _ in $(seq 1 "$WAIT_SECONDS"); do
	if docker run --rm --network "$network" "$CURL_IMAGE" \
		--fail --silent --show-error \
		--connect-timeout 2 \
		--max-time 2 \
		"http://embedding-server/health" >/dev/null 2>&1; then
		ready=1
		break
	fi
	if ! docker container inspect --format '{{.State.Running}}' "$container" 2>/dev/null | grep -qx true; then
		break
	fi
	sleep 1
done

if [[ "$ready" != 1 ]]; then
	echo "embedding server did not become ready within ${WAIT_SECONDS}s" >&2
	if ! docker container inspect --format '{{.State.Running}}' "$container" 2>/dev/null | grep -qx true; then
		echo "embedding server exited before becoming ready" >&2
	fi
	docker logs "$container" >&2 || true
	exit 1
fi

single_request=$(jq -cn --arg model "$SERVED_MODEL_NAME" \
	'{input: "What is a local embedding server?", model: $model, dimensions: 512}')
batch_request=$(jq -cn --arg model "$SERVED_MODEL_NAME" \
	'{input: ["first input", "second input"], model: $model, dimensions: 512}')

	docker run --rm --network "$network" "$CURL_IMAGE" \
	--fail --silent --show-error \
	--max-time "$REQUEST_TIMEOUT_SECONDS" \
	--header 'Content-Type: application/json' \
	--data "$single_request" \
	"http://embedding-server/v1/embeddings" >"$single_response"

	docker run --rm --network "$network" "$CURL_IMAGE" \
	--fail --silent --show-error \
	--max-time "$REQUEST_TIMEOUT_SECONDS" \
	--header 'Content-Type: application/json' \
	--data "$batch_request" \
	"http://embedding-server/v1/embeddings" >"$batch_response"

jq -e --arg model "$SERVED_MODEL_NAME" '
	.object == "list" and
	.model == $model and
	(.data | length) == 1 and
	.data[0].object == "embedding" and
	.data[0].index == 0 and
	(.data[0].embedding | length) == 512 and
	all(.data[0].embedding[]; (type == "number" and isfinite))
' "$single_response" >/dev/null

jq -e --arg model "$SERVED_MODEL_NAME" '
	.object == "list" and
	.model == $model and
	(.data | length) == 2 and
	([.data[].object] | all(.[]; . == "embedding")) and
	([.data[].index] == [0, 1]) and
	all(.data[].embedding; (length == 512 and all(.[]; (type == "number" and isfinite))))
' "$batch_response" >/dev/null

if docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$container" | \
	grep -q '^HF_HUB_OFFLINE=1$'; then
	:
else
	echo "container is not configured for Hugging Face offline mode" >&2
	exit 1
fi

if docker logs "$container" 2>&1 | grep -Eiq 'download(ing|ed)?|https?://huggingface.co'; then
	echo "embedding server logs indicate a runtime model download" >&2
	docker logs "$container" >&2 || true
	exit 1
fi

echo "embedding-server smoke test passed for ${SERVED_MODEL_NAME}"
