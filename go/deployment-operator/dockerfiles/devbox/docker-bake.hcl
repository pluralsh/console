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

variable "VERSION" {
  default = "dev"
}

variable "DAEMON_SOURCE" {
  default = "build"
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
