# Seeded from /etc/devbox/skel on the instance's first boot. Yours to edit; the
# daemon never overwrites files that already exist in the home directory.

[ -r /usr/local/lib/devbox/devbox.sh ] && emulate sh -c '. /usr/local/lib/devbox/devbox.sh'

HISTFILE="$HOME/.zsh_history"
HISTSIZE=10000
SAVEHIST=20000

# oh-my-zsh lives read-only in the image; its cache and completion dump go under the home.
if [ -r /usr/share/oh-my-zsh/oh-my-zsh.sh ]; then
  export ZSH=/usr/share/oh-my-zsh
  ZSH_THEME="robbyrussell"
  ZSH_CACHE_DIR="$HOME/.cache/oh-my-zsh"
  ZSH_COMPDUMP="$ZSH_CACHE_DIR/.zcompdump"
  zstyle ':omz:update' mode disabled
  plugins=(git)
  mkdir -p "$ZSH_CACHE_DIR/completions"
  source "$ZSH/oh-my-zsh.sh"
else
  autoload -Uz compinit && compinit -u
  PROMPT='%F{green}%B%n@devbox%b%f:%F{blue}%B%~%b%f%# '
  alias ls='ls --color=auto'
  alias ll='ls -alF'
fi

setopt append_history hist_ignore_dups share_history

if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate zsh)"
fi
