# Keep Alpine security package floors explicit. apk treats the version predicates as
# hard constraints; the build fails rather than producing an image below a floor.
apk add --no-cache \
  openssh-client libgcc libstdc++ ncurses-libs openssl-dev ca-certificates \
  "git>=2.52.1-r0" "git-init-template>=2.52.1-r0" \
  "zlib>=1.3.2-r1" "musl-utils>=1.2.5-r24" \
  gnupg bash pcre2=10.49-r0 "brotli-libs>=1.2.1-r0"
apk info -e \
  "git>=2.52.1-r0" "git-init-template>=2.52.1-r0" \
  "zlib>=1.3.2-r1" "musl-utils>=1.2.5-r24"
# Preserve existing BusyBox, ssl_client, and gnutls security upgrades.
apk upgrade --no-cache busybox busybox-binsh ssl_client gnutls
apk add --no-cache --virtual=build gcc musl-dev libffi-dev openssl-dev make
apk del build
addgroup --gid 10001 app
adduser -D -h /home/console -u 10001 -G app console
chown console:app /opt/app
mkdir -p /opt/app/data
