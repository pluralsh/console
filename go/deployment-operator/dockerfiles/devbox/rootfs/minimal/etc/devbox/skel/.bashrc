# Seeded from /etc/devbox/skel on the instance's first boot. Yours to edit; the
# daemon never overwrites files that already exist in the home directory.

[ -r /usr/local/lib/devbox/devbox.sh ] && . /usr/local/lib/devbox/devbox.sh

case $- in
  *i*) ;;
  *) return ;;
esac

HISTCONTROL=ignoreboth
HISTSIZE=10000
HISTFILESIZE=20000
shopt -s histappend checkwinsize

PS1='\[\e[1;32m\]\u@devbox\[\e[0m\]:\[\e[1;34m\]\w\[\e[0m\]\$ '

alias ls='ls --color=auto'
alias ll='ls -alF'
alias grep='grep --color=auto'

if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate bash)"
fi
