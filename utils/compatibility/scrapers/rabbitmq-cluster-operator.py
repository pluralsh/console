from collections import OrderedDict

from utils import (
    current_kube_version,
    get_latest_github_release,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "rabbitmq-cluster-operator"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"

# This upstream change explicitly documents the requirements for Operator 2.20+:
# https://github.com/rabbitmq/rabbitmq-website/commit/8f27a606dab0b2f9f39afca59319d841a0166fe6
# These are installation requirements, not the separate list of tested versions.
MIN_OPERATOR = "2.20.0"
MIN_KUBE = "1.31"


def build_latest_version(release, latest_kube):
    version = validate_semver(str(release).lstrip("v"))
    kube = validate_semver(str(latest_kube))
    minimum_kube = validate_semver(MIN_KUBE)
    if not version or version < validate_semver(MIN_OPERATOR) or version.major != 2:
        raise ValueError("Review upstream requirements before adding this operator release.")
    if not kube or kube.major != minimum_kube.major or kube < minimum_kube:
        raise ValueError("KUBE_VERSION must include the upstream Kubernetes 1.31 minimum.")

    breaking_changes = [
        f"Requires Kubernetes {MIN_KUBE} or later.",
        "Cluster Operator 2.20 and later requires cert-manager to be installed; "
        "upstream does not specify a minimum cert-manager version.",
        "The RabbitMQ image must provide RabbitMQ 3.13.7 or later from a supported release series.",
    ]
    if version >= validate_semver("2.22.0"):
        # https://github.com/rabbitmq/cluster-operator/releases/tag/v2.22.0
        breaking_changes.extend([
            "Operator 2.22+ uses an HTTP startup probe available in RabbitMQ 4.2.4+ "
            "and 4.3.0+. Older RabbitMQ versions require the annotation "
            'rabbitmq.com/legacy-startup-probe: "true"; upstream notes that such '
            "versions are unsupported community releases.",
            "Upgrading the operator can roll the managed RabbitMQ StatefulSets. "
            "Pause reconciliation before upgrading and resume when safe to control timing.",
        ])

    return OrderedDict(
        [
            ("version", str(version)),
            ("kube", [f"{kube.major}.{minor}" for minor in range(kube.minor, minimum_kube.minor - 1, -1)]),
            ("requirements", []),
            ("incompatibilities", []),
            ("summary", {
                "helm_changes": "Install this upstream release using its cluster-operator.yml manifest.",
                "chart_updates": [],
                "features": [],
                "breaking_changes": breaking_changes,
            }),
        ]
    )


def scrape():
    # The chart-based table omits newer upstream releases. Add only
    # the current upstream release, without inventing a chart-version mapping.
    # update_compatibility_info retains the existing historical version rows.
    release = get_latest_github_release("rabbitmq", "cluster-operator")
    row = build_latest_version(release, current_kube_version())
    update_compatibility_info(TARGET_FILE, [row])
