#!/bin/bash
set -e

ssh-keygen -t rsa -f softserve -N ""
export SOFT_SERVE_INITIAL_ADMIN_KEYS
SOFT_SERVE_INITIAL_ADMIN_KEYS=$(cat softserve.pub)
echo "soft serve admin keys: $SOFT_SERVE_INITIAL_ADMIN_KEYS"

soft serve &
sleep 10
echo "started soft serve server"

ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -p 23231 -i softserve admin@localhost repo import deployment-operator https://github.com/pluralsh/deployment-operator.git
ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -p 23231 -i softserve admin@localhost repo import scaffolds https://github.com/pluralsh/scaffolds.git
