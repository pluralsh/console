#!/bin/sh
# A kubectl stand-in for hack/test-hook-scripts.sh. It implements just the
# calls files/scripts/apply.sh makes, keeping objects as files under
# $FAKE_STATE/<kind>/<namespace>/<name>/<key>.
#
#   FAKE_RACE=<secret>  "get" reports the secret missing but "create" finds it
#                       (a concurrent hook run won the race).
#   FAKE_ISSUER=<url>   issuer in /.well-known/openid-configuration ("" = 404).
set -eu
: "${FAKE_STATE:?}"

ns=""
name=""
type=""
dry_run=""
files=""
jsonpath=""
file="-"
raw=""
positional=""
while [ $# -gt 0 ]; do
  case "$1" in
    -n) ns="$2"; shift 2 ;;
    --type=*) type="${1#--type=}"; shift ;;
    --from-file=*) files="$files ${1#--from-file=}"; shift ;;
    --dry-run=client) dry_run=1; shift ;;
    -o) [ "$2" = yaml ] || jsonpath="$2"; shift 2 ;;
    -f) file="$2"; shift 2 ;;
    --raw) raw="$2"; shift 2 ;;
    *) positional="$positional $1"; shift ;;
  esac
done
set -- $positional

obj_dir() { echo "$FAKE_STATE/$1/${2:-_}/$3"; }

case "$1" in
  get)
    if [ -n "$raw" ]; then
      [ -n "${FAKE_ISSUER:-}" ] || exit 1
      printf '{"issuer":"%s","jwks_uri":"%s/openid/v1/jwks"}' "$FAKE_ISSUER" "$FAKE_ISSUER"
      exit 0
    fi
    kind="$2" name="$3"
    dir="$(obj_dir "$kind" "$ns" "$name")"
    if [ "$kind" = secret ] && [ "${FAKE_RACE:-}" = "$name" ]; then
      exit 1
    fi
    [ -d "$dir" ] || { echo "Error from server (NotFound): $kind \"$name\" not found" >&2; exit 1; }
    case "$jsonpath" in
      "jsonpath={.data.tls\.crt}") base64 <"$dir/tls.crt" | tr -d '\n' ;;
      "") ;;
      *) echo "fake-kubectl: unsupported jsonpath $jsonpath" >&2; exit 2 ;;
    esac
    ;;
  create)
    kind="$2"
    if [ "$kind" = namespace ]; then
      mkdir -p "$(obj_dir namespace "" "$3")"
      exit 0
    fi
    case "$kind" in
      secret) [ "$3" = generic ] || { echo "fake-kubectl: unsupported create $*" >&2; exit 2; }; name="$4" ;;
      configmap) name="$3" ;;
      *) echo "fake-kubectl: unsupported create $*" >&2; exit 2 ;;
    esac
    dir="$(obj_dir "$kind" "$ns" "$name")"
    if [ -n "$dry_run" ]; then
      # Stage the object; the following "apply -f -" commits it.
      staged="$FAKE_STATE/.staged"
      rm -rf "$staged" && mkdir -p "$staged"
      for f in $files; do cp "${f#*=}" "$staged/${f%%=*}"; done
      echo "$kind $ns $name" >"$staged/.target"
      echo "kind: $kind"
      exit 0
    fi
    if [ -d "$dir" ]; then
      echo "Error from server (AlreadyExists): secrets \"$name\" already exists" >&2
      exit 1
    fi
    mkdir -p "$dir"
    for f in $files; do cp "${f#*=}" "$dir/${f%%=*}"; done
    echo "$type" >"$dir/.type"
    ;;
  apply)
    if [ "$file" = - ]; then input="$(cat)"; else input="$(cat "$file")"; fi
    case "$input" in
      *"kind: Namespace"*)
        nsname="$(echo "$input" | sed -n 's/^  name: //p' | head -1)"
        mkdir -p "$(obj_dir namespace "" "$nsname")"
        echo "$input" >"$(obj_dir namespace "" "$nsname")/manifest"
        ;;
      *)
        staged="$FAKE_STATE/.staged"
        read -r kind sns sname <"$staged/.target"
        dir="$(obj_dir "$kind" "$sns" "$sname")"
        rm -rf "$dir" && mkdir -p "$dir"
        cp "$staged"/* "$dir/"
        ;;
    esac
    ;;
  *)
    echo "fake-kubectl: unsupported command $*" >&2
    exit 2
    ;;
esac
