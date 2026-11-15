# Seeded from /etc/devbox/skel on the instance's first boot. Yours to edit; the
# daemon never overwrites files that already exist in the home directory.

if [ -n "$BASH_VERSION" ] && [ -f "$HOME/.bashrc" ]; then
  . "$HOME/.bashrc"
fi
