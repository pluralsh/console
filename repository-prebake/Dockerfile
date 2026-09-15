# Precloned git repositories plus a tiny userspace so the agent-run
# init container can copy them into /plural/shared/repos.
#
# Image layout:
#   /data/manifest.json
#   /data/<path>/          # full git clone, including .git
FROM busybox:1.37
COPY --chown=65532:65532 . /data
