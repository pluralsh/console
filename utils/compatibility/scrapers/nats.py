"""Build NATS compatibility data from release-tagged chart install-test targets."""

import re
import shlex
from collections import OrderedDict

import requests
import yaml
from packaging.version import Version

from utils import print_success, update_compatibility_info

app_name = "nats"
chart_index_url = "https://nats-io.github.io/k8s/helm/charts/index.yaml"
chart_url = (
    "https://raw.githubusercontent.com/nats-io/k8s/"
    "refs/tags/{tag}/helm/charts/nats/Chart.yaml"
)
workflow_url = (
    "https://raw.githubusercontent.com/nats-io/k8s/"
    "refs/tags/{tag}/.github/workflows/test.yaml"
)

stable_version = re.compile(r"^\d+\.\d+\.\d+$")
kube_minor = re.compile(r"^\d+\.\d+$")

# nats-0.13.2 is the earliest NATS chart release whose release-tagged
# install workflow exposes explicit Kubernetes minor targets. Older chart
# releases may work, but this scraper intentionally does not infer minors.
evidence_floor = Version("0.13.2")


def normalize_app_version(value):
    """Return a canonical stable NATS server version from Helm appVersion."""
    if not isinstance(value, str):
        raise ValueError(f"Invalid NATS appVersion: {value!r}")
    value = value.strip().lstrip("v")
    match = re.fullmatch(r"(\d+\.\d+\.\d+)(?:-alpine)?", value)
    if not match:
        raise ValueError(f"Invalid stable NATS appVersion: {value!r}")
    return match.group(1)


def parse_chart_index(content):
    """Discover stable NATS chart releases from the official Helm index."""
    data = yaml.safe_load(content)
    entries = data.get("entries") if isinstance(data, dict) else None
    charts = entries.get("nats") if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("NATS chart entries not found in Helm index")

    by_chart = {}
    for entry in charts:
        if not isinstance(entry, dict):
            raise ValueError("Invalid NATS Helm index entry")

        chart_version = entry.get("version")
        if not isinstance(chart_version, str) or not stable_version.fullmatch(chart_version):
            # Ignore prerelease/beta chart versions; malformed stable-looking rows fail below.
            continue
        if Version(chart_version) < evidence_floor:
            continue

        app_version = normalize_app_version(entry.get("appVersion"))
        tag = f"nats-{chart_version}"

        urls = entry.get("urls")
        if not isinstance(urls, list) or not urls or any(not isinstance(url, str) for url in urls):
            raise ValueError(f"Missing NATS chart URL for {chart_version}")
        expected = f"/releases/download/{tag}/nats-{chart_version}.tgz"
        if not any(expected in url for url in urls):
            raise ValueError(
                f"NATS Helm index URL does not match release tag for {chart_version}"
            )

        current = by_chart.get(chart_version)
        candidate = {
            "app_version": app_version,
            "chart_version": chart_version,
            "tag": tag,
        }
        if current and current != candidate:
            raise ValueError(f"Conflicting NATS Helm index entries for {chart_version}")
        by_chart[chart_version] = candidate

    if not by_chart:
        raise ValueError("No stable NATS charts with explicit-evidence-era versions found")

    return sorted(
        by_chart.values(),
        key=lambda item: Version(item["chart_version"]),
        reverse=True,
    )


def select_latest_chart_per_app(candidates):
    """Plural rows are app-version keyed; retain the newest chart for each app."""
    selected = {}
    for candidate in candidates:
        app_version = candidate["app_version"]
        existing = selected.get(app_version)
        if existing is None or Version(candidate["chart_version"]) > Version(
            existing["chart_version"]
        ):
            selected[app_version] = candidate
    return sorted(
        selected.values(),
        key=lambda item: Version(item["app_version"]),
        reverse=True,
    )


def fetch_candidates():
    response = requests.get(chart_index_url, timeout=30)
    response.raise_for_status()
    return select_latest_chart_per_app(parse_chart_index(response.text))


def parse_chart(content, expected):
    data = yaml.safe_load(content)
    if not isinstance(data, dict) or data.get("name") != "nats":
        raise ValueError(f"Invalid NATS Chart.yaml for {expected['tag']}")

    chart_version = data.get("version")
    if not isinstance(chart_version, str) or not stable_version.fullmatch(chart_version):
        raise ValueError(f"Invalid NATS chart version for {expected['tag']}")
    if chart_version != expected["chart_version"]:
        raise ValueError(
            f"NATS release tag/chart version mismatch for {expected['tag']}: "
            f"{chart_version!r}"
        )

    app_version = normalize_app_version(data.get("appVersion"))
    if app_version != expected["app_version"]:
        raise ValueError(
            f"NATS Helm index/Chart.yaml appVersion mismatch for {expected['tag']}: "
            f"{app_version!r} != {expected['app_version']!r}"
        )
    return app_version, chart_version


def _flatten_run(run):
    run = re.sub(r"\\\s*\n", " ", run)
    return " ".join(run.split())


def _can_fail(value):
    """Treat every non-false continue-on-error value as potentially allowing failure."""
    if value is None or value is False:
        return False
    return not (isinstance(value, str) and value.strip().lower() == "false")


def _can_skip(value):
    """Reject conditional evidence unless the condition is explicitly true."""
    if value is None or value is True:
        return False
    return not (isinstance(value, str) and value.strip().lower() == "true")


def _shell_tokens(command):
    try:
        return shlex.split(command, comments=True, posix=True)
    except ValueError as exc:
        raise ValueError("Unable to parse NATS chart install command") from exc


def _flag_values(tokens, flag):
    values = []
    for index, token in enumerate(tokens):
        if token == flag:
            if index + 1 >= len(tokens) or tokens[index + 1].startswith("--"):
                raise ValueError(f"Missing value for {flag}")
            values.append(tokens[index + 1])
        elif token.startswith(flag + "="):
            value = token[len(flag) + 1 :]
            if not value:
                raise ValueError(f"Missing value for {flag}")
            values.append(value)
    return values


def parse_workflow(content):
    workflow = yaml.safe_load(content)
    jobs = workflow.get("jobs") if isinstance(workflow, dict) else None
    lint_test = jobs.get("lint-test") if isinstance(jobs, dict) else None
    if not isinstance(lint_test, dict):
        raise ValueError("NATS lint-test job not found")
    if _can_fail(lint_test.get("continue-on-error")):
        raise ValueError("NATS install-test job is allowed to fail")
    if _can_skip(lint_test.get("if")):
        raise ValueError("NATS install-test job is conditional")

    strategy = lint_test.get("strategy")
    matrix = strategy.get("matrix") if isinstance(strategy, dict) else None
    if isinstance(matrix, dict) and ("include" in matrix or "exclude" in matrix):
        raise ValueError("NATS Kubernetes matrix uses include/exclude overrides")
    versions = matrix.get("k8s") if isinstance(matrix, dict) else None
    if not isinstance(versions, list) or not versions:
        raise ValueError("NATS Kubernetes install-test matrix not found")

    parsed = set()
    for version in versions:
        # Quoted minor strings are required; YAML would turn 1.30 into float 1.3.
        if not isinstance(version, str) or not kube_minor.fullmatch(version):
            raise ValueError(f"Invalid Kubernetes matrix value: {version!r}")
        parsed.add(version)

    steps = lint_test.get("steps")
    if not isinstance(steps, list):
        raise ValueError("NATS chart install-test steps not found")

    cluster_uses_matrix = False
    install_steps = []
    for step in steps:
        if not isinstance(step, dict):
            continue
        run = step.get("run")
        if not isinstance(run, str):
            continue
        flat = _flatten_run(run)

        if "microk8s" in flat and re.search(
            r"--channel=(?:[\"'])?\$\{\{\s*matrix\.k8s\s*\}\}/stable(?:[\"'])?",
            flat,
        ):
            if _can_skip(step.get("if")):
                raise ValueError("NATS cluster creation step is conditional")
            cluster_uses_matrix = True

        if re.search(r"\bct\s+install\b", flat):
            if _can_fail(step.get("continue-on-error")):
                raise ValueError("NATS chart install step is allowed to fail")
            if _can_skip(step.get("if")):
                raise ValueError("NATS chart install step is conditional")
            install_steps.append(flat)

    if not cluster_uses_matrix:
        raise ValueError("NATS Kubernetes matrix is not used to create the test cluster")
    if len(install_steps) != 1:
        raise ValueError("Expected exactly one NATS chart install command")

    command = install_steps[0]
    match = re.search(r"\bct\s+install\b", command)
    if not match:
        raise ValueError("NATS chart install command not found")
    tokens = _shell_tokens(command[match.start() :])
    if len(tokens) < 2 or tokens[0:2] != ["ct", "install"]:
        raise ValueError("NATS chart install command is malformed")
    if "--all" not in tokens[2:]:
        raise ValueError("NATS chart is not covered by ct install --all")

    chart_dirs = _flag_values(tokens[2:], "--chart-dirs")
    if chart_dirs != ["helm/charts"]:
        raise ValueError("NATS chart install does not target exactly helm/charts")

    excluded_values = _flag_values(tokens[2:], "--excluded-charts")
    excluded = set()
    for value in excluded_values:
        if not re.fullmatch(r"[A-Za-z0-9._-]+(?:,[A-Za-z0-9._-]+)*", value):
            raise ValueError("NATS excluded-charts value is dynamic or malformed")
        excluded.update(item.strip() for item in value.split(","))
    if "nats" in excluded:
        raise ValueError("NATS is excluded from the chart install test")

    return sorted(
        parsed,
        key=lambda value: tuple(map(int, value.split("."))),
        reverse=True,
    )


def scrape():
    candidates = fetch_candidates()
    if not candidates:
        raise ValueError("No stable NATS chart candidates found")

    rows = []
    # Validate every selected source before writing any compatibility data.
    for candidate in candidates:
        tag = candidate["tag"]

        chart_response = requests.get(chart_url.format(tag=tag), timeout=30)
        chart_response.raise_for_status()
        app_version, chart_version = parse_chart(chart_response.text, candidate)

        workflow_response = requests.get(workflow_url.format(tag=tag), timeout=30)
        workflow_response.raise_for_status()
        kube_versions = parse_workflow(workflow_response.text)

        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", kube_versions),
                    ("chart_version", chart_version),
                    ("images", []),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
        print_success(
            f"Fetched NATS {app_version} / chart {chart_version} from {tag}"
        )

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
