# Seeded from /etc/devbox/skel on the instance's first boot. Yours to edit; the
# daemon never overwrites files that already exist in the home directory.

[ -r /usr/local/lib/devbox/devbox.sh ] && emulate sh -c '. /usr/local/lib/devbox/devbox.sh'

HISTFILE="$HOME/.zsh_history"
HISTSIZE=10000
SAVEHIST=20000
setopt append_history hist_ignore_dups share_history

autoload -Uz compinit && compinit -u
PROMPT='%F{green}%B%n@devbox%b%f:%F{blue}%B%~%b%f%# '

alias ls='ls --color=auto'
alias ll='ls -alF'

if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate zsh)"
fi
