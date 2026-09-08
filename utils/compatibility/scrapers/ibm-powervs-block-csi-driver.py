import re

app_name = "ibm-powervs-block-csi-driver"
compatibility_url = (
    "https://raw.githubusercontent.com/kubernetes-sigs/"
    "ibm-powervs-block-csi-driver/main/README.md"
)


def parse_compatibilities(content):
    """Read only the published release rows in the upstream CSI matrix."""
    if isinstance(content, bytes):
        content = content.decode("utf-8")

    in_section = False
    table = []
    for line in content.splitlines():
        heading = re.match(r"^#+\s+(.+?)\s*#*\s*$", line)
        if heading:
            if in_section:
                break
            in_section = heading.group(1) == "CSI Specification Compatibility Matrix"
        elif in_section and line.strip().startswith("|"):
            table.append([cell.strip() for cell in line.strip().strip("|").split("|")])
        elif table and line.strip():
            break

    if len(table) < 3 or table[0] != [
        "PowerVS CSI Driver", "Kubernetes", "CSI", "Golang"
    ]:
        raise ValueError("PowerVS compatibility matrix missing or header changed")
    if len(table[1]) != 4 or any(
        not re.fullmatch(r":?-+:?", cell) for cell in table[1]
    ):
        raise ValueError("PowerVS compatibility matrix separator changed")

    versions = {}
    for cells in table[2:]:
        if len(cells) != 4:
            raise ValueError("Malformed PowerVS compatibility row")
        version, kube, _, _ = cells
        # The development branch does not represent a released driver version.
        if version == "main":
            continue
        if not re.fullmatch(r"\d+\.\d+\.\d+", version):
            raise ValueError(f"Unexpected PowerVS release version: {version}")
        if not re.fullmatch(r"\d+\.\d+(?:\.\d+)?", kube):
            raise ValueError(f"Unexpected PowerVS Kubernetes version: {kube}")
        if version in versions:
            raise ValueError(f"Duplicate PowerVS release: {version}")
        versions[version] = {
            "version": version,
            # Plural stores Kubernetes minor versions; do not infer a wider range.
            "kube": [".".join(kube.split(".")[:2])],
            "requirements": [],
            "incompatibilities": [],
        }

    if not versions:
        raise ValueError("No released PowerVS compatibility rows found")
    return [versions[v] for v in sorted(
        versions, key=lambda value: tuple(map(int, value.split("."))), reverse=True
    )]


def scrape():
    from utils import fetch_page, update_compatibility_info

    content = fetch_page(compatibility_url)
    if not content:
        raise ValueError("Failed to fetch PowerVS compatibility matrix")
    rows = parse_compatibilities(content)
    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
