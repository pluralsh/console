# Antrea compatibility scraper

The official [Helm installation guide](https://github.com/antrea-io/antrea/blob/main/docs/helm.md)
identifies `https://charts.antrea.io` and states that Helm distribution starts at
Antrea v1.8. The scraper reads only the `antrea` chart's stable appVersions;
flow-aggregator, theia, pre-Helm releases and prereleases are not substituted for
Antrea releases.

Each application version gets its own tagged README, rather than reusing main's
current prerequisites for historical releases. For example:

- [v1.15.2](https://github.com/antrea-io/antrea/blob/v1.15.2/README.md#prerequisites): Kubernetes 1.16 or later.
- [v2.0.0](https://github.com/antrea-io/antrea/blob/v2.0.0/README.md#prerequisites): Kubernetes 1.19 or later.
- [v2.7.0](https://github.com/antrea-io/antrea/blob/v2.7.0/README.md#prerequisites): Kubernetes 1.23 or later.

The generated `kube` array expands that explicit `or later` lower bound through
the repository's `KUBE_VERSION`, currently 1.36. It encodes the upstream statement;
it does not claim this contribution ran Antrea on every Kubernetes version.
NodeIPAM, Open vSwitch, OS-specific and optional feature requirements remain as
described in upstream's installation documentation.

All stable chart versions are considered independently, including patch releases
with changed prerequisites. Missing or ambiguous tagged documentation aborts
before calling the shared updater. That updater retains representative version
boundaries using the repository's existing reduction policy, and resolves images
through Helm rendering. Older releases without an official Helm chart are not
included. The scraper does not install a cluster or change a live cluster.

## Unit tests

From the repository root, with Make and Docker Compose available, use the
repository's required test entry point. The current test image is Alpine-based;
the command installs Python and an isolated dependency environment in that
disposable container:

```sh
TEST_CMD='apk add --no-cache python3 py3-pip && python3 -m venv /tmp/antrea-tests && /tmp/antrea-tests/bin/python -m pip install packaging==24.1 && /tmp/antrea-tests/bin/python -m unittest discover -s utils/compatibility/tests -p test_antrea.py -v'
CONSOLE_CMD="\"$TEST_CMD\"" make test-full TEST_CMD="$TEST_CMD"
```

Both variables are supplied because `docker-compose.test.yml` currently reads
`CONSOLE_CMD`, while the Makefile documents `TEST_CMD`. The embedded quotes keep
the command as one argument to the container's `/bin/sh -c`. The Make target retains
its existing dependency startup, console exit-code propagation and teardown.
The six tests were also checked directly with Python 3.13 during development;
the Docker wrapper has not been run on the Windows development host, which has
neither Make nor Docker. Hosted workflow execution requires maintainer approval.

The tests cover per-tag source selection, appVersion versus chart version,
patch-level prerequisite changes, prerelease/pre-Helm filtering, malformed and
missing sources, invalid Kubernetes bounds and entry-point failure atomicity.

## Regenerate from upstream

Use the compatibility tool's Python environment and Helm 3 on PATH. From
`utils/compatibility`, run:

```sh
OPENAI_API_KEY= EXA_API_KEY= python -c 'from scrapers.antrea import scrape; scrape()'
```

This fetches the official chart index and tagged READMEs, renders charts locally
to extract image references and updates only `static/compatibilities/antrea.yaml`.
The command disables optional paid summary generation. It requires network access
and may update the local Helm repository cache.
