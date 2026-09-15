#!/usr/bin/env bash
# Build an OCI image containing precloned git repositories, manifest.json, and
# a tiny userspace so an init container can copy them into /plural/shared/repos.
# Uses the caller's git credentials (ssh-agent, GIT_ASKPASS, credential helpers).
# See README.md in this directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKERFILE="${SCRIPT_DIR}/Dockerfile"

CONFIG=""
IMAGE=""
PUSH=0
DRY_RUN=0
KEEP_STAGING=0
RECURSE_SUBMODULES=0
LFS=0
STAGING=""
DOCKER_BIN="${DOCKER_BIN:-docker}"
LOCAL_DIRS=""

usage() {
  cat <<'EOF'
Usage: prebake.sh --config repos.yaml --image name:tag [options]

Clone the repositories listed in a YAML config into a staging directory, write
manifest.json, and build an image that an init container copies into /plural/shared/repos.

Options:
  --config PATH            YAML file listing repositories (required)
  --image NAME[:TAG]       Image name to build (required)
  --push                   Push the image after a successful build
  --staging DIR            Staging directory (default: a temporary directory)
  --keep-staging           Do not delete the staging directory on exit
  --local PATH=DIR         Use an existing checkout at DIR for PATH instead of cloning
  --recurse-submodules     Pass --recurse-submodules to git clone
  --lfs                    Fetch Git LFS objects (skipped by default)
  --dry-run                Parse the config and print planned clones; do not clone or build
  -h, --help               Show this help

Config format:

  repositories:
    - url: https://github.com/org/repo.git
      path: repo                 # optional, defaults to the repo name
      branch: main               # optional, defaults to the remote default branch
      compileScript: precompile.sh          # optional, relative to this directory
      compileDockerfile: compile.Dockerfile # optional, builder image for compileScript

The resulting image has manifest.json and one directory per repository under /data.
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

info() {
  echo "$*" >&2
}

trim() {
  # shellcheck disable=SC2001
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

strip_inline_comment() {
  local v="$1"
  case "$v" in
    *' #'*) printf '%s' "${v%% #*}" ;;
    *) printf '%s' "$v" ;;
  esac
}

unquote() {
  local v
  v="$(trim "$(strip_inline_comment "$1")")"
  case "$v" in
    \"*\") v="${v#\"}"; v="${v%\"}" ;;
    \'*\') v="${v#\'}"; v="${v%\'}" ;;
  esac
  printf '%s' "$v"
}

sanitize_git_url() {
  local url="$1"
  if [[ "$url" =~ ^([a-zA-Z][a-zA-Z0-9+.-]*)://([^@/]+)@(.+)$ ]]; then
    printf '%s://%s' "${BASH_REMATCH[1]}" "${BASH_REMATCH[3]}"
  else
    printf '%s' "$url"
  fi
}

repo_name_from_url() {
  local url="$1"
  url="${url%/}"
  url="${url%.git}"
  url="${url##*/}"
  url="${url##*:}"
  [ -n "$url" ] || die "could not derive repository name from $1"
  printf '%s' "$url"
}

validate_path() {
  local path="$1"
  [ -n "$path" ] || die "repository path must not be empty"
  [ "$path" != "manifest.json" ] || die "repository path cannot be manifest.json"
  case "$path" in
    /*) die "repository path must be relative: $path" ;;
  esac

  local rest="$path" comp
  while [ -n "$rest" ]; do
    comp="${rest%%/*}"
    if [ "$comp" = "$rest" ]; then
      rest=""
    else
      rest="${rest#*/}"
    fi
    [ -n "$comp" ] || die "repository path has an empty component: $path"
    [ "$comp" != "." ] && [ "$comp" != ".." ] || die "repository path is invalid: $path"
  done
}

flush_repo() {
  local url="$1"
  local path="$2"
  local branch="$3"
  local compile_script="$4"
  local compile_dockerfile="$5"
  [ -n "$url" ] || return 0
  url="$(sanitize_git_url "$url")"
  [ -n "$path" ] || path="$(repo_name_from_url "$url")"
  validate_path "$path"
  printf '%s\t%s\t%s\t%s\t%s\n' "$url" "$path" "$branch" "$compile_script" "$compile_dockerfile"
}

parse_repos_yaml() {
  local file="$1"
  [ -f "$file" ] || die "config file not found: $file"

  local url="" path="" branch="" compile_script="" compile_dockerfile="" line key value
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    line="$(trim "$line")"
    [ -z "$line" ] && continue
    case "$line" in
      \#*) continue ;;
      ---) continue ;;
      repositories:|repos:) continue ;;
    esac

    if [[ "$line" =~ ^-[[:space:]]+url:[[:space:]]*(.*)$ ]]; then
      flush_repo "$url" "$path" "$branch" "$compile_script" "$compile_dockerfile"
      url="$(unquote "${BASH_REMATCH[1]}")"
      path=""
      branch=""
      compile_script=""
      compile_dockerfile=""
      continue
    fi

    if [[ "$line" =~ ^-[[:space:]]+(https?://.*|git@.*|ssh://.*)$ ]]; then
      flush_repo "$url" "$path" "$branch" "$compile_script" "$compile_dockerfile"
      url="$(unquote "${BASH_REMATCH[1]}")"
      path=""
      branch=""
      compile_script=""
      compile_dockerfile=""
      continue
    fi

    if [[ "$line" =~ ^-[[:space:]] ]]; then
      die "unsupported list item in $file: $line"
    fi

    case "$line" in
      *:*)
        key="$(trim "${line%%:*}")"
        value="$(unquote "${line#*:}")"
        case "$key" in
          url) url="$value" ;;
          path) path="$value" ;;
          branch|defaultBranch) branch="$value" ;;
          compileScript) compile_script="$value" ;;
          compileDockerfile) compile_dockerfile="$value" ;;
          *) ;;
        esac
        ;;
    esac
  done < "$file"

  flush_repo "$url" "$path" "$branch" "$compile_script" "$compile_dockerfile"
}

write_manifest() {
  local out="$1"
  python3 -c '
import json, sys

repos = []
for line in sys.stdin:
    line = line.rstrip("\n")
    if not line:
        continue
    parts = line.split("\t")
    if len(parts) < 3:
        raise SystemExit("invalid repo record: %r" % (line,))
    url, path, branch = parts[0], parts[1], parts[2]
    entry = {"url": url, "path": path}
    if branch:
        entry["defaultBranch"] = branch
    repos.append(entry)

json.dump({"version": 1, "repositories": repos}, sys.stdout, indent=2)
sys.stdout.write("\n")
' > "$out"
}

clone_repo() {
  local url="$1"
  local dest="$2"
  local branch="$3"

  info "cloning $url -> $dest"
  mkdir -p "$(dirname "$dest")"

  local clone_args=(clone --quiet)
  if [ "$RECURSE_SUBMODULES" -eq 1 ]; then
    clone_args+=(--recurse-submodules)
  fi
  if [ -n "$branch" ]; then
    clone_args+=(--branch "$branch")
  fi
  clone_args+=("$url" "$dest")

  if [ "$LFS" -eq 0 ]; then
    GIT_LFS_SKIP_SMUDGE=1 git "${clone_args[@]}"
  else
    git "${clone_args[@]}"
  fi

  git -C "$dest" remote set-url origin "$url"
  git -C "$dest" config --local --unset-all http.extraHeader >/dev/null 2>&1 || true

  if [ -z "$branch" ]; then
    branch="$(git -C "$dest" symbolic-ref --short HEAD 2>/dev/null || git -C "$dest" rev-parse --abbrev-ref HEAD)"
  fi
  printf '%s' "$branch"
}

local_dir_for() {
  local path="$1"
  local mapping
  while IFS= read -r mapping || [ -n "$mapping" ]; do
    [ -z "$mapping" ] && continue
    case "$mapping" in
      "$path"=*)
        printf '%s' "${mapping#*=}"
        return 0
        ;;
    esac
  done <<< "$LOCAL_DIRS"
  return 1
}

# Split a tab-separated repo record without collapsing empty fields.
parse_record() {
  local rec="$1"
  url=$(printf '%s\n' "$rec" | cut -f1)
  path=$(printf '%s\n' "$rec" | cut -f2)
  branch=$(printf '%s\n' "$rec" | cut -f3)
  compile_script=$(printf '%s\n' "$rec" | cut -f4)
  compile_dockerfile=$(printf '%s\n' "$rec" | cut -f5)
}

compile_repo() {
  local dest="$1"
  local compile_script="$2"
  local compile_dockerfile="$3"

  [ -n "$compile_script" ] || return 0
  [ -n "$compile_dockerfile" ] || die "compileDockerfile is required when compileScript is set"

  local script_abs dockerfile_abs builder_image context_dir
  script_abs="$SCRIPT_DIR/$compile_script"
  dockerfile_abs="$SCRIPT_DIR/$compile_dockerfile"
  [ -f "$script_abs" ] || die "compile script not found: $script_abs"
  [ -f "$dockerfile_abs" ] || die "compile Dockerfile not found: $dockerfile_abs"

  context_dir="$(cd "$(dirname "$dockerfile_abs")" && pwd)"
  builder_image="repository-prebake-compile:local"
  info "building compile image from $dockerfile_abs"
  "$DOCKER_BIN" build -f "$dockerfile_abs" -t "$builder_image" "$context_dir"

  info "compiling $dest"
  "$DOCKER_BIN" run --rm \
    -v "$dest:/src" \
    -v "$script_abs:/precompile.sh:ro" \
    -w /src \
    "$builder_image" \
    bash /precompile.sh
}

cleanup() {
  if [ "$KEEP_STAGING" -eq 0 ] && [ -n "${STAGING:-}" ] && [ -d "${STAGING:-}" ]; then
    rm -rf "$STAGING"
  fi
}

while [ $# -gt 0 ]; do
  case "$1" in
    --config)
      [ $# -ge 2 ] || die "--config requires a path"
      CONFIG="$2"
      shift 2
      ;;
    --image)
      [ $# -ge 2 ] || die "--image requires a name"
      IMAGE="$2"
      shift 2
      ;;
    --push)
      PUSH=1
      shift
      ;;
    --staging)
      [ $# -ge 2 ] || die "--staging requires a directory"
      STAGING="$2"
      KEEP_STAGING=1
      shift 2
      ;;
    --keep-staging)
      KEEP_STAGING=1
      shift
      ;;
    --local)
      [ $# -ge 2 ] || die "--local requires PATH=DIR"
      case "$2" in
        *=*) ;;
        *) die "--local requires PATH=DIR" ;;
      esac
      LOCAL_DIRS="${LOCAL_DIRS}${LOCAL_DIRS:+$'\n'}$2"
      KEEP_STAGING=1
      shift 2
      ;;
    --recurse-submodules)
      RECURSE_SUBMODULES=1
      shift
      ;;
    --lfs)
      LFS=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[ -n "$CONFIG" ] || die "--config is required"
if [ "$DRY_RUN" -eq 0 ]; then
  [ -n "$IMAGE" ] || die "--image is required"
fi

command -v git >/dev/null 2>&1 || die "git is required"
if [ "$DRY_RUN" -eq 0 ]; then
  command -v python3 >/dev/null 2>&1 || die "python3 is required to write manifest.json"
  command -v "$DOCKER_BIN" >/dev/null 2>&1 || die "$DOCKER_BIN is required to build the image"
  [ -f "$DOCKERFILE" ] || die "Dockerfile not found: $DOCKERFILE"
fi

RECORDS="$(parse_repos_yaml "$CONFIG")"
[ -n "$RECORDS" ] || die "no repositories found in $CONFIG"

SEEN_PATHS=""
SEEN_URLS=""
while IFS= read -r record; do
  [ -n "$record" ] || continue
  parse_record "$record"

  case $'\n'"$SEEN_PATHS"$'\n' in
    *$'\n'"$path"$'\n'*) die "duplicate repository path: $path" ;;
  esac
  case $'\n'"$SEEN_URLS"$'\n' in
    *$'\n'"$url"$'\n'*) die "duplicate repository url: $url" ;;
  esac
  SEEN_PATHS="${SEEN_PATHS}${SEEN_PATHS:+$'\n'}$path"
  SEEN_URLS="${SEEN_URLS}${SEEN_URLS:+$'\n'}$url"

  if [ "$DRY_RUN" -eq 1 ]; then
    local_src=""
    if local_src="$(local_dir_for "$path")"; then
      info "would use local checkout $local_src -> $path"
    elif [ -n "$branch" ]; then
      info "would clone $url -> $path (branch $branch)"
    else
      info "would clone $url -> $path"
    fi
    if [ -n "$compile_script" ]; then
      info "would compile $path with $compile_script ($compile_dockerfile)"
    fi
  fi
done <<< "$RECORDS"

if [ "$DRY_RUN" -eq 1 ]; then
  exit 0
fi

if [ -z "$STAGING" ]; then
  STAGING="$(mktemp -d "${TMPDIR:-/tmp}/repository-prebake.XXXXXX")"
fi
mkdir -p "$STAGING"
trap cleanup EXIT

info "staging directory: $STAGING"

MANIFEST_RECORDS=""
while IFS= read -r record; do
  [ -n "$record" ] || continue
  parse_record "$record"
  dest="$STAGING/$path"
  local_src=""

  if local_src="$(local_dir_for "$path")"; then
    [ -d "$local_src/.git" ] || die "local checkout is not a git repository: $local_src"
    dest="$(cd "$local_src" && pwd)"
    expected="$(cd "$STAGING" && pwd)/$path"
    if [ "$dest" != "$expected" ]; then
      die "local checkout for $path must live at $expected (got $dest). Set --staging to the parent directory of the checkout."
    fi
    info "using local checkout $dest"
    if [ -z "$branch" ]; then
      branch="$(git -C "$dest" symbolic-ref --short HEAD 2>/dev/null || git -C "$dest" rev-parse --abbrev-ref HEAD)"
    fi
    resolved_branch="$branch"
  else
    [ ! -e "$dest" ] || die "staging path already exists: $dest"
    resolved_branch="$(clone_repo "$url" "$dest" "$branch")"
  fi

  compile_repo "$dest" "$compile_script" "$compile_dockerfile"
  MANIFEST_RECORDS="${MANIFEST_RECORDS}${MANIFEST_RECORDS:+$'\n'}${url}"$'\t'"${path}"$'\t'"${resolved_branch}"
done <<< "$RECORDS"

printf '%s\n' "$MANIFEST_RECORDS" | write_manifest "$STAGING/manifest.json"
info "wrote $STAGING/manifest.json"

info "building $IMAGE"
"$DOCKER_BIN" build -f "$DOCKERFILE" -t "$IMAGE" "$STAGING"

if [ "$PUSH" -eq 1 ]; then
  info "pushing $IMAGE"
  "$DOCKER_BIN" push "$IMAGE"
fi

info "built $IMAGE"
