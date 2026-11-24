# devbox-minimal and devbox-fat as one build. devbox-fat is FROM devbox-minimal, so its final stage still needs
# minimal's filesystem, but its other stages (toolchain images, gopls, CLI downloads) run alongside minimal, and
# the final stage starts from minimal's build graph instead of waiting for a pushed image.
#
#   cd go && docker buildx bake -f deployment-operator/dockerfiles/devbox/docker-bake.hcl
#
# Paths are relative to the directory bake runs in, which must be ./go: the build context, and bake only reads
# files under its working directory without extra entitlements.
#
# CD sets the platform, outputs and caches with --set, and labels with docker/metadata-action's bake files.
#
# runtime-core (the plural-runtime sidecar) is not in the default group: CD builds it once per source hash, see
# runtime-src-hash.sh. To build it here:
#
#   cd go && SOURCE_DATE_EPOCH=0 docker buildx bake -f deployment-operator/dockerfiles/devbox/docker-bake.hcl runtime-core

variable "VERSION" {
  default = "dev"
}

variable "DAEMON_SOURCE" {
  default = "build"
}

# The source hash of runtime-core, from runtime-src-hash.sh.
variable "SRC_HASH" {
  default = "unknown"
}

group "default" {
  targets = ["minimal", "fat"]
}

# Replaced by docker/metadata-action's bake files in CD.
target "minimal-meta" {}
target "fat-meta" {}

target "minimal" {
  inherits   = ["minimal-meta"]
  context    = "."
  dockerfile = "deployment-operator/dockerfiles/devbox/minimal.Dockerfile"
  args = {
    VERSION       = VERSION
    DAEMON_SOURCE = DAEMON_SOURCE
  }
}

target "fat" {
  inherits   = ["fat-meta"]
  context    = "."
  dockerfile = "deployment-operator/dockerfiles/devbox/fat.Dockerfile"
  contexts = {
    devbox-minimal = "target:minimal"
  }
  args = {
    BASE_IMAGE = "devbox-minimal"
  }
}

# Reproducible: no metadata-action labels (they carry the build time and commit), no attestations, and
# rewrite-timestamp with SOURCE_DATE_EPOCH=0 from the environment.
target "runtime-core" {
  context    = "."
  dockerfile = "deployment-operator/dockerfiles/devbox/runtime-core.Dockerfile"
  args = {
    VERSION  = VERSION
    SRC_HASH = SRC_HASH
  }
  attest = ["type=provenance,disabled=true", "type=sbom,disabled=true"]
  output = ["type=image,name=devbox-runtime-core,rewrite-timestamp=true"]
}
