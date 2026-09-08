from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest import mock


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "yunikorn.py"
sys.path.insert(0, str(COMPATIBILITY_DIR))

spec = importlib.util.spec_from_file_location("yunikorn", MODULE_PATH)
yunikorn = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(yunikorn)


MATRIX = """
# Kubernetes versions supported by YuniKorn

| K8s Version         | Supported <br/>from version | Support ended |
|---------------------|:---------------------------:|:-------------:|
| 1.12.x (or earlier) |              -              |       -       |
| 1.13.x              |            0.8.0            |    0.10.0     |
| 1.14.x              |            0.8.0            |    0.10.0     |
| 1.15.x              |            0.8.0            |    0.10.0     |
| 1.16.x              |           0.10.0            |    0.11.0     |
| 1.17.x              |           0.10.0            |    0.11.0     |
| 1.18.x              |           0.10.0            |    0.11.0     |
| 1.19.x              |           0.11.0            |     1.0.0     |
| 1.20.x              |           0.12.1            |     1.2.0     |
| 1.21.x              |           0.12.1            |     1.3.0     |
| 1.22.x              |           0.12.2            |     1.3.0     |
| 1.23.x              |           0.12.2            |     1.3.0     |
| 1.24.x              |            1.0.0            |       -       |
| 1.25.x              |            1.2.0            |       -       |
| 1.26.x              |            1.2.0            |       -       |
| 1.27.x              |            1.4.0            |       -       |
| 1.28.x              |            1.4.0            |       -       |
| 1.29.x              |            1.5.0            |       -       |
| 1.30.x              |            1.6.0            |       -       |
| 1.31.x              |            1.6.0            |       -       |
| 1.32.x              |            1.7.0            |       -       |
| 1.33.x              |            1.8.0            |       -       |
| 1.34.x              |            1.8.0            |       -       |
| 1.35.x              |            1.9.0            |       -       |
"""


def helm_index(*versions: str) -> bytes:
    rows = "\n".join(
        f"    - appVersion: {version}\n      version: {version}" for version in versions
    )
    return f"apiVersion: v1\nentries:\n  yunikorn:\n{rows}\n".encode()


class YuniKornScraperTest(unittest.TestCase):
    def test_parse_support_matrix_reads_explicit_support_rules(self):
        rules = yunikorn.parse_support_matrix(MATRIX)
        self.assertIsNotNone(rules)
        assert rules is not None
        self.assertIn(("1.13", yunikorn.Version("0.8.0"), yunikorn.Version("0.10.0")), rules)
        self.assertIn(("1.35", yunikorn.Version("1.9.0"), None), rules)
        self.assertNotIn("1.12", [rule[0] for rule in rules])

    def test_support_ended_is_exclusive(self):
        rules = yunikorn.parse_support_matrix(MATRIX)
        assert rules is not None
        rows = yunikorn.build_rows(
            rules,
            {"0.9.0": "0.9.0", "0.10.0": "0.10.0"},
        )
        by_version = {row["version"]: row for row in rows}
        self.assertEqual(by_version["0.9.0"]["kube"], ["1.13", "1.14", "1.15"])
        self.assertEqual(by_version["0.10.0"]["kube"], ["1.16", "1.17", "1.18"])

    def test_current_supported_ceiling_does_not_infer_1_36(self):
        rules = yunikorn.parse_support_matrix(MATRIX)
        assert rules is not None
        rows = yunikorn.build_rows(rules, {"1.9.0": "1.9.0"})
        self.assertEqual(len(rows), 1)
        self.assertIn("1.35", rows[0]["kube"])
        self.assertNotIn("1.36", rows[0]["kube"])

    def test_malformed_heading_or_row_fails_closed(self):
        self.assertIsNone(yunikorn.parse_support_matrix(MATRIX.replace(
            "# Kubernetes versions supported by YuniKorn",
            "# Kubernetes test versions",
        )))
        self.assertIsNone(yunikorn.parse_support_matrix(MATRIX + "| broken | row |\n"))

    def test_parse_helm_index_keeps_stable_exact_mappings(self):
        content = b"""apiVersion: v1
entries:
  yunikorn:
    - appVersion: 1.9.0
      version: 1.9.0
    - appVersion: 1.10.0-rc.1
      version: 1.10.0-rc.1
"""
        self.assertEqual(yunikorn.parse_helm_index(content), {"1.9.0": "1.9.0"})

    def test_conflicting_helm_mapping_fails_closed(self):
        content = b"""apiVersion: v1
entries:
  yunikorn:
    - appVersion: 1.9.0
      version: 1.9.1
"""
        self.assertIsNone(yunikorn.parse_helm_index(content))

    def test_scrape_does_not_update_on_matrix_failure(self):
        with mock.patch.object(
            yunikorn,
            "fetch_page",
            side_effect=[b"not the support matrix", helm_index("1.9.0")],
        ), mock.patch.object(yunikorn, "update_compatibility_info") as update:
            yunikorn.scrape()
            update.assert_not_called()

    def test_scrape_does_not_update_on_source_failure(self):
        with mock.patch.object(yunikorn, "fetch_page", return_value=None), mock.patch.object(
            yunikorn, "update_compatibility_info"
        ) as update:
            yunikorn.scrape()
            update.assert_not_called()

    def test_scrape_updates_only_after_both_sources_validate(self):
        with mock.patch.object(
            yunikorn,
            "fetch_page",
            side_effect=[MATRIX.encode(), helm_index("1.8.0", "1.9.0")],
        ), mock.patch.object(yunikorn, "update_compatibility_info") as update:
            yunikorn.scrape()
            update.assert_called_once()
            target, rows = update.call_args.args
            self.assertEqual(target, yunikorn.TARGET_FILE)
            self.assertEqual([row["version"] for row in rows], ["1.8.0", "1.9.0"])
            self.assertNotIn("1.36", rows[-1]["kube"])


if __name__ == "__main__":
    unittest.main()
