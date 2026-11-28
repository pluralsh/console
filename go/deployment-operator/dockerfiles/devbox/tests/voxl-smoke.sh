#!/usr/bin/env bash
# Starts Xvfb and voxl and takes a screenshot through voxl: the binary loads, captures and encodes on its own.
# Run in a bare Debian container with voxl at /usr/local/bin/voxl (devbox-voxl.yaml).
set -euo pipefail

apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends xvfb >/dev/null

Xvfb :99 -screen 0 1280x800x24 -nolisten tcp >/dev/null 2>&1 &
sleep 1
DISPLAY=:99 VOXL_PASSWORD=pw voxl --addr=127.0.0.1 --port=6901 --audio-enabled=false >/tmp/voxl.log 2>&1 &

get() {
  exec 3<>/dev/tcp/127.0.0.1/6901
  printf 'GET %s HTTP/1.0\r\nHost: 127.0.0.1\r\nAuthorization: Bearer pw\r\n\r\n' "$1" >&3
  cat <&3
  exec 3<&-
}

for _ in $(seq 50); do
  if get /healthz >/tmp/health 2>/dev/null && grep -q '^ok' /tmp/health; then
    get /screenshot >/tmp/shot
    if grep -q '^HTTP/1.[01] 200' /tmp/shot && grep -aq $'\x89PNG' /tmp/shot; then
      voxl --version
      exit 0
    fi
    break
  fi
  sleep 0.2
done
echo "voxl didn't serve a screenshot of the display" >&2
cat /tmp/voxl.log >&2
exit 1
