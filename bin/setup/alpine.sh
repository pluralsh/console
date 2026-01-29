apk update
# Upgrade busybox packages to fix CVE in tar (terminal escape sequence vulnerability)
apk upgrade --no-cache busybox busybox-binsh
apk add openssh-client libgcc libstdc++ ncurses-libs openssl-dev ca-certificates git gnupg bash
apk add --no-cache --update --virtual=build gcc musl-dev libffi-dev openssl-dev make
apk del build
addgroup --gid 10001 app
adduser -D -h /home/console -u 10001 -G app console
chown console:app /opt/app
mkdir -p /opt/app/data