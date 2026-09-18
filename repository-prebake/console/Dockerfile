# syntax=docker/dockerfile:1
#
# Console prebake image: extend the published repository-prebake base, COPY
# this checkout, RUN prebake, then precompile.sh. mise and compile packages
# come from the base image.
#
#   docker build -f repository-prebake/console/Dockerfile \
#     --build-arg PREBAKE_IMAGE=ghcr.io/pluralsh/repository-prebake:local \
#     --secret id=git_token,env=GIT_ACCESS_TOKEN \
#     -t ghcr.io/pluralsh/console-repos:local .

ARG PREBAKE_IMAGE=ghcr.io/pluralsh/repository-prebake:latest

FROM ${PREBAKE_IMAGE}

ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    ELIXIR_ERL_OPTIONS="+fnu" \
    PRECOMPILE_ROOT=/data/console \
    MISE_TRUSTED_CONFIG_PATHS=/data/console

COPY repository-prebake/console/repos.yaml /config/repos.yaml
COPY repository-prebake/console/precompile.sh /usr/local/bin/precompile.sh
COPY . /data/console
RUN --mount=type=secret,id=git_token \
    chmod +x /usr/local/bin/precompile.sh \
 && git config --global --add safe.directory /data/console \
 && GIT_ACCESS_TOKEN="$(cat /run/secrets/git_token)" \
    prebake --config /config/repos.yaml \
 && precompile.sh \
 && chown -R 65532:65532 /data

USER 65532
