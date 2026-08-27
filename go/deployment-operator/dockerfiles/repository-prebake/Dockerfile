# Data-only image of precloned git repositories.
# The image root is the volume root: when Kubernetes mounts this image at
# /plural/repos the harness sees /plural/repos/manifest.json plus one directory
# per repository.
#
# Files are owned by uid 65532 (nonroot) so agent-run pods can read them.
FROM scratch
COPY --chown=65532:65532 . /
