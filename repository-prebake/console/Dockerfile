# syntax=docker/dockerfile:1
#
# Console prebake image: extend the published repository-prebake base, COPY
# this checkout, RUN prebake, then run each repository/language precompile
# script in order. mise and compile packages come from the base image.
#
#   docker build -f repository-prebake/console/Dockerfile \
#     --build-arg PREBAKE_IMAGE=docker.io/pluralsh/repository-prebake:local \
#     --secret id=git_token,env=GIT_ACCESS_TOKEN \
#     -t docker.io/pluralsh/console-repos:local .

ARG PREBAKE_IMAGE=docker.io/pluralsh/repository-prebake:latest

FROM ${PREBAKE_IMAGE}

ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    ELIXIR_ERL_OPTIONS="+fnu" \
    PRECOMPILE_ROOT=/data/console \
    MISE_TRUSTED_CONFIG_PATHS=/data/console

COPY repository-prebake/console/repos.yaml /config/repos.yaml
COPY repository-prebake/console/precompile/ /usr/local/lib/repository-prebake/precompile/
COPY . /data/console
RUN --mount=type=secret,id=git_token,required=false \
    chmod +x /usr/local/lib/repository-prebake/precompile/*.sh \
 && git config --global --add safe.directory /data/console \
 && GIT_ACCESS_TOKEN="$(cat /run/secrets/git_token 2>/dev/null || true)" \
    prebake --config /config/repos.yaml \
 && for script in /usr/local/lib/repository-prebake/precompile/*.sh; do "$script"; done \
 && chown -R 65532:65532 /data

USER 65532
