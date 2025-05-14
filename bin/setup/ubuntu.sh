apt-get update
apt-get install -y openssh-client gcc libstdc++6 libncurses5 libssl-dev ca-certificates git gnupg bash build-essential libffi-dev make
groupadd --gid 10001 app
useradd --create-home --home-dir /home/console --uid 10001 --gid app console
chown console:app /opt/app
mkdir -p /opt/app/data