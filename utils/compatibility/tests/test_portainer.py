import io
import sys
import tarfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scrapers.portainer import build_versions, chart_ce_version, parse_compatibility


TABLE = """### Portainer Business Edition (BE)
| Portainer Version | Kubernetes Version |
| Business 2.45.0 LTS | 1.99 |
### Portainer Community Edition (CE)
| Portainer Version | Release Date | Kubernetes Version |
| --- | --- | --- |
| Community 2.45.0 LTS | August 27, 2026 | 1.34 1.36 |
| Community 2.39.6 LTS | August 13, 2026 | 1.33 1.34 1.35 |
### Other
| Community 9.99.0 | today | 1.99 |
"""


def package(tag, enabled=False):
    output = io.BytesIO()
    values = f"enterpriseEdition:\n  enabled: {str(enabled).lower()}\nimage:\n  repository: portainer/portainer-ce\n  tag: {tag}\n".encode()
    with tarfile.open(fileobj=output, mode="w:gz") as archive:
        member = tarfile.TarInfo("portainer/values.yaml")
        member.size = len(values)
        archive.addfile(member, io.BytesIO(values))
    return output.getvalue()


class PortainerTests(unittest.TestCase):
    def test_ce_only_and_no_interpolated_kubernetes_minors(self):
        self.assertEqual(parse_compatibility(TABLE), {
            "2.45.0": ["1.34", "1.36"], "2.39.6": ["1.33", "1.34", "1.35"]})

    def test_layout_change_fails(self):
        for text in ["", TABLE.replace("Community 2.", "CE 2.")]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                parse_compatibility(text)

    def test_malformed_row_is_warned_and_skipped_without_guessing(self):
        for malformed in ["1.34-1.36", "1.31 1.32 .133"]:
            with self.assertWarns(UserWarning):
                versions = parse_compatibility(TABLE.replace("1.34 1.36", malformed))
            self.assertEqual(list(versions), ["2.39.6"])

    def test_breaks_and_duplicate_versions(self):
        self.assertEqual(parse_compatibility(TABLE.replace("1.34 1.36", "1.36<br/>1.34 1.34"))["2.45.0"], ["1.34", "1.36"])

    def test_conflicting_rows_fail(self):
        text = TABLE.replace("### Other", "| Community 2.45.0 LTS | today | 1.33 |\n### Other")
        with self.assertRaises(ValueError):
            parse_compatibility(text)

    def test_chart_requires_pinned_ce_default(self):
        self.assertEqual(chart_ce_version(package("2.45.0")), "2.45.0")
        self.assertIsNone(chart_ce_version(package("latest")))
        self.assertIsNone(chart_ce_version(package("2.45.0", enabled=True)))

    def test_metadata_is_not_used_as_ce_version(self):
        index = {"entries": {"portainer": [
            {"version": "245.0.0", "appVersion": "ce-latest-ee-2.45.0", "urls": ["new.tgz"]},
            {"version": "244.0.0", "appVersion": "ce-2.45.0-ee-2.45.0", "urls": ["old.tgz"]},
        ]}}
        def fetch(url):
            return package("latest" if url.endswith("new.tgz") else "2.45.0")
        versions = build_versions(TABLE, index, fetch)
        self.assertEqual(versions[0]["chart_version"], "244.0.0")
        self.assertNotIn("chart_version", versions[1])

    def test_newest_stable_chart_selected_independent_of_index_order(self):
        entries = [{"version": v, "appVersion": "2.45.0", "urls": [v + ".tgz"]}
                   for v in ["244.0.0", "246.0.0-rc1", "245.0.0"]]
        versions = build_versions(TABLE, {"entries": {"portainer": entries}}, lambda _: package("2.45.0"))
        self.assertEqual(versions[0]["chart_version"], "245.0.0")


if __name__ == "__main__":
    unittest.main()
