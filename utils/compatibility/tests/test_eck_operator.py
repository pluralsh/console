import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

helpers = ModuleType("utils")
helpers.fetch_page = Mock()
helpers.get_chart_versions = Mock()
helpers.update_compatibility_info = Mock()

# The scraper imports its helpers from a top-level `utils` module. Keep that
# temporary stub strictly scoped to module loading so this test cannot affect
# compatibility tests imported later in the same unittest discovery process.
_original_utils = sys.modules.get("utils")
sys.modules["utils"] = helpers
try:
    SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "eck-operator.py"
    spec = importlib.util.spec_from_file_location("eck_operator", SCRAPER_PATH)
    scraper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scraper)
finally:
    if _original_utils is None:
        sys.modules.pop("utils", None)
    else:
        sys.modules["utils"] = _original_utils


def readme(kube_range: str) -> bytes:
    return f"""# Elastic Cloud on Kubernetes (ECK)

Supported versions:

* Kubernetes {kube_range}
* OpenShift 4.16-4.22
""".encode("utf-8")


class EckOperatorTests(unittest.TestCase):
    def test_parses_kubernetes_range_descending(self):
        self.assertEqual(
            scraper.parse_kube_range(readme("1.32-1.36").decode()),
            ["1.36", "1.35", "1.34", "1.33", "1.32"],
        )

    def test_accepts_whitespace_around_range_separator(self):
        self.assertEqual(
            scraper.parse_kube_range(readme("1.31 - 1.35").decode()),
            ["1.35", "1.34", "1.33", "1.32", "1.31"],
        )

    def test_missing_kubernetes_range_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "support range not found"):
            scraper.parse_kube_range("# ECK\n* OpenShift 4.16-4.22")

    def test_reversed_range_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "reversed"):
            scraper.parse_kube_range(readme("1.36-1.32").decode())

    def test_latest_patch_per_minor_and_legacy_filter(self):
        charts = {
            "3.5.0": "3.5.0",
            "3.4.0": "3.4.0",
            "3.4.1": "3.4.1",
            "3.3.2": "3.3.2",
            "3.6.0-beta1": "3.6.0-beta1",
            "2.16.0": "2.16.0",
            "not-a-version": "x",
        }
        self.assertEqual(
            scraper.latest_chart_per_minor(charts),
            [
                ("3.5.0", "3.5.0"),
                ("3.4.1", "3.4.1"),
                ("3.3.2", "3.3.2"),
            ],
        )

    def test_build_rows_uses_tagged_release_readmes(self):
        charts = {"3.5.0": "3.5.0", "3.4.1": "3.4.1"}
        payloads = {
            scraper.README_URL.format(version="3.5.0"): readme("1.32-1.36"),
            scraper.README_URL.format(version="3.4.1"): readme("1.31-1.36"),
        }

        rows = scraper.build_rows(charts, payloads.get)

        self.assertEqual([row["version"] for row in rows], ["3.5.0", "3.4.1"])
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34", "1.33", "1.32"])
        self.assertEqual(rows[1]["chart_version"], "3.4.1")

    def test_missing_tagged_readme_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Could not fetch"):
            scraper.build_rows({"3.5.0": "3.5.0"}, lambda _: None)

    def test_invalid_utf8_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Could not decode"):
            scraper.build_rows({"3.5.0": "3.5.0"}, lambda _: b"\xff")

    def test_scrape_connects_helm_versions_to_shared_updater(self):
        charts = {"3.5.0": "3.5.0"}
        with (
            patch.object(scraper, "get_chart_versions", return_value=charts) as get_charts,
            patch.object(scraper, "fetch_page", return_value=readme("1.32-1.36")),
            patch.object(scraper, "update_compatibility_info") as update,
        ):
            original = scraper.build_rows

            def wired(chart_versions):
                return original(chart_versions, scraper.fetch_page)

            with patch.object(scraper, "build_rows", side_effect=wired):
                scraper.scrape()

        get_charts.assert_called_once_with("eck-operator")
        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/eck-operator.yaml")
        self.assertEqual(rows[0]["version"], "3.5.0")

    def test_scrape_rejects_empty_helm_mapping(self):
        with patch.object(scraper, "get_chart_versions", return_value={}):
            with self.assertRaisesRegex(ValueError, "No official ECK Helm"):
                scraper.scrape()


if __name__ == "__main__":
    unittest.main()
