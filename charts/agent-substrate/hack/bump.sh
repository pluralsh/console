#!/usr/bin/env bash
# Pins the images Plural builds for this chart to a deployment-operator release and bumps the chart's patch
# version, as the devbox release workflow does for each go/deployment-operator/vX.Y.Z tag.
#
#   charts/agent-substrate/hack/bump.sh 0.6.77
set -euo pipefail

version=${1:?usage: bump.sh <deployment-operator version, e.g. 0.6.77>}
version=${version#v}
if ! [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "bump.sh: $version isn't X.Y.Z" >&2
  exit 1
fi

chart=$(cd "$(dirname "$0")/.." && pwd)

# yq drops blank lines, so apply only the lines it changed.
edit() {
  local file=$1 expr=$2
  diff -U0 -B "$file" <(yq "$expr" "$file") | patch --quiet --no-backup-if-mismatch "$file" || true
}

edit "$chart/values.yaml" "
  .zerofs.image.tag = \"$version\" |
  .juicefs.image.tag = \"$version\" |
  .block.image.tag = \"$version\" |
  .assetStaging.image = \"ghcr.io/pluralsh/deployment-operator:$version\"
"

current=$(yq '.version' "$chart/Chart.yaml")
IFS=. read -r major minor patch <<<"$current"
sed -i.bak "s/^version: .*/version: $major.$minor.$((patch + 1))/" "$chart/Chart.yaml" && rm "$chart/Chart.yaml.bak"

for check in \
  "$(yq '.zerofs.image.tag' "$chart/values.yaml")" \
  "$(yq '.juicefs.image.tag' "$chart/values.yaml")" \
  "$(yq '.block.image.tag' "$chart/values.yaml")" \
  "$(yq '.assetStaging.image' "$chart/values.yaml" | sed 's/.*://')"; do
  if [[ $check != "$version" ]]; then
    echo "bump.sh: an image wasn't pinned to $version" >&2
    exit 1
  fi
done
echo "agent-substrate $current -> $(yq '.version' "$chart/Chart.yaml"), images at $version"
