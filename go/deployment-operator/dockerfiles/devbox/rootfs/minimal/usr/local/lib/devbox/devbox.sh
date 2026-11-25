# Shared shell setup for devbox images (POSIX sh). Sourced by /etc/profile.d,
# the skeleton .bashrc/.zshrc and the cloud CLI wrappers in devbox-fat.

# Cloud identities (federated tokens, section 4.9). The daemon writes KEY=VALUE
# lines here and rewrites the token files under /run/plural/identity/<name>/token.
_devbox_identity_env="${DEVBOX_IDENTITY_DIR:-/run/plural/identity}/env"
if [ -r "$_devbox_identity_env" ]; then
  case $- in
    *a*) . "$_devbox_identity_env" ;;
    *) set -a; . "$_devbox_identity_env"; set +a ;;
  esac
fi
unset _devbox_identity_env

# gcloud ignores GOOGLE_APPLICATION_CREDENTIALS for its own commands.
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -z "${CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE:-}" ]; then
  export CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE="$GOOGLE_APPLICATION_CREDENTIALS"
fi

# The agents the plural-runtime sidecar installed (claude, codex, ...). The daemon puts them first on PATH, and
# login shells reset PATH, so terminals put them back.
if [ -n "${DEVBOX_RUNTIME_DIR:-}" ] && [ -d "$DEVBOX_RUNTIME_DIR/bin" ]; then
  case ":$PATH:" in
    *":$DEVBOX_RUNTIME_DIR/bin:"*) ;;
    *) PATH="$DEVBOX_RUNTIME_DIR/bin:$PATH"; export PATH ;;
  esac
fi
