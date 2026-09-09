import importlib.util
from pathlib import Path
import unittest

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "falco-operator.py"
spec = importlib.util.spec_from_file_location("falco_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

INDEX = """entries:
  falco-operator:
  - version: 0.4.0-rc1
    appVersion: 0.5.0-rc1
  - version: 0.3.1
    appVersion: 0.4.1
  - version: 0.3.0
    appVersion: 0.4.0
  - version: 0.2.0
    appVersion: 0.3.0
  - version: 0.1.0
    appVersion: 0.2.2
"""

README_129 = """# Falco Operator
The Artifact Operator is automatically deployed as a native sidecar (Kubernetes 1.29+)
alongside each Falco instance.
"""


class FalcoOperatorTests(unittest.TestCase):
    def test_parses_release_minimum_kubernetes(self):
        self.assertEqual(scraper.parse_min_kubernetes(README_129), "1.29")
    def test_missing_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "minimum Kubernetes version not found"):
            scraper.parse_min_kubernetes("# Falco Operator\nUse Kubernetes.")

    def test_expands_minimum_through_current_version(self):
        self.assertEqual(
            scraper.expand_minimum("1.29", "1.32"),
            ["1.32", "1.31", "1.30", "1.29"],
        )

    def test_skips_prerelease_and_groups_by_app_minor(self):
        groups = scraper.stable_charts_by_app_minor(INDEX)
        self.assertEqual(
            [[(str(app), str(chart)) for app, chart in group] for group in groups],
            [
                [("0.4.1", "0.3.1"), ("0.4.0", "0.3.0")],
                [("0.3.0", "0.2.0")],
                [("0.2.2", "0.1.0")],
            ],
        )

    def test_build_rows_uses_tagged_release_evidence(self):
        docs = {
            scraper.release_readme_url.format(version="0.4.1"): README_129,
            scraper.release_readme_url.format(version="0.3.0"): README_129,
            scraper.release_readme_url.format(version="0.2.2"): README_129,
        }
        rows = scraper.build_rows(INDEX, "1.32", docs.get)
        by_version = {row["version"]: row for row in rows}
        self.assertEqual(list(by_version), ["0.4.1", "0.3.0", "0.2.2"])
        self.assertEqual(by_version["0.4.1"]["chart_version"], "0.3.1")
        self.assertEqual(
            by_version["0.4.1"]["kube"],
            ["1.32", "1.31", "1.30", "1.29"],
        )

    def test_missing_latest_patch_falls_back_within_app_minor(self):
        docs = {
            scraper.release_readme_url.format(version="0.4.0"): README_129,
            scraper.release_readme_url.format(version="0.3.0"): README_129,
            scraper.release_readme_url.format(version="0.2.2"): README_129,
        }
        rows = scraper.build_rows(INDEX, "1.32", docs.get)
        self.assertEqual(rows[0]["version"], "0.4.0")
        self.assertEqual(rows[0]["chart_version"], "0.3.0")

    def test_missing_all_tagged_docs_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "No documented Falco Operator"):
            scraper.build_rows(INDEX, "1.32", lambda _: None)

    def test_bad_index_payload_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Unexpected Falco Helm index"):
            scraper.stable_charts_by_app_minor(object())

if __name__ == "__main__":
    unittest.main()
