from pathlib import Path
import importlib.util
import sys
import unittest
from types import ModuleType
from unittest.mock import Mock, patch


COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "tetragon_scraper", COMPATIBILITY / "scrapers/tetragon.py"
)
scraper = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(scraper)


INDEX = """apiVersion: v1
entries:
  tetragon:
  - version: 1.7.1
    appVersion: 1.7.1
  - version: 1.7.0
    appVersion: 1.7.0
  - version: 1.7.0-rc.1
    appVersion: 1.7.0-rc.1
"""

CHART = """apiVersion: v2
name: tetragon
version: 1.7.1
appVersion: 1.7.1
"""

CHART_170 = CHART.replace("1.7.1", "1.7.0")
SOURCE = 'const (\n\tMinimalVersionConstraint = "1.16.0"\n)\n'
SOURCE_170 = 'const (\n\tMinimalVersionConstraint = "1.20.0"\n)\n'


class TetragonScraperTests(unittest.TestCase):
    def test_chart_identity_requires_matching_stable_versions(self):
        self.assertEqual(scraper.parse_chart_identity(CHART), ("1.7.1", "1.7.1"))
        with self.assertRaisesRegex(ValueError, "identity"):
            scraper.parse_chart_identity(
                "name: tetragon\nversion: 1.7.1\nappVersion: 1.7.0\n"
            )
        with self.assertRaisesRegex(ValueError, "identity"):
            scraper.parse_chart_identity(
                "name: other\nversion: 1.7.1\nappVersion: 1.7.1\n"
            )

    def test_chart_index_ignores_prereleases(self):
        self.assertEqual(
            scraper.parse_chart_index(INDEX),
            {"1.7.1": "1.7.1", "1.7.0": "1.7.0"},
        )

    def test_minimum_parser_requires_the_release_constant(self):
        self.assertEqual(scraper.parse_minimum_kubernetes(SOURCE), "1.16")
        with self.assertRaisesRegex(ValueError, "constraint not found"):
            scraper.parse_minimum_kubernetes('const Other = "1.16.0"')

    def test_expand_minimum_is_descending_and_bounded(self):
        self.assertEqual(
            scraper.expand_minimum("1.16", "1.36"),
            [f"1.{minor}" for minor in range(36, 15, -1)],
        )
        with self.assertRaisesRegex(ValueError, "newer than Plural"):
            scraper.expand_minimum("1.37", "1.36")

    def test_stable_releases_are_unique_and_newest_first(self):
        self.assertEqual(
            scraper.stable_releases(
                [("v1.7.0", 1), "v1.7.1", "v1.7.1-rc.1", "bad"]
            ),
            ["1.7.1", "1.7.0"],
        )

    def test_build_rows_uses_tagged_sources_and_chart_identity(self):
        sources = {
            scraper.CHART_URL.format(tag="v1.7.1"): CHART.encode(),
            scraper.VERSION_URL.format(tag="v1.7.1"): SOURCE.encode(),
            scraper.CHART_URL.format(tag="v1.7.0"): CHART_170.encode(),
            scraper.VERSION_URL.format(tag="v1.7.0"): SOURCE_170.encode(),
        }
        rows = scraper.build_rows(
            ["v1.7.1", "v1.7.0"],
            INDEX,
            sources.get,
            "1.36",
        )
        self.assertEqual([row["version"] for row in rows], ["1.7.1", "1.7.0"])
        self.assertEqual(rows[0]["chart_version"], "1.7.1")
        self.assertEqual(rows[0]["kube"][0], "1.36")
        self.assertEqual(rows[0]["kube"][-1], "1.16")
        self.assertEqual(rows[1]["kube"][-1], "1.20")

    def test_build_rows_rejects_index_and_tag_mismatch(self):
        bad_chart = CHART.replace("version: 1.7.1", "version: 1.7.0")
        sources = {
            scraper.CHART_URL.format(tag="v1.7.1"): bad_chart.encode(),
            scraper.VERSION_URL.format(tag="v1.7.1"): SOURCE.encode(),
        }
        with self.assertRaisesRegex(ValueError, "identity"):
            scraper.build_rows(["v1.7.1"], INDEX, sources.get, "1.36")

    def test_scrape_wires_official_sources(self):
        helpers = ModuleType("utils")
        helpers.current_kube_version = Mock(return_value="1.36")
        helpers.get_github_releases_timestamps = Mock(return_value=[("v1.7.1", 1)])
        helpers.update_compatibility_info = Mock()

        def fetch(url):
            if url == scraper.HELM_INDEX_URL:
                return INDEX.encode()
            return {
                scraper.CHART_URL.format(tag="v1.7.1"): CHART.encode(),
                scraper.VERSION_URL.format(tag="v1.7.1"): SOURCE.encode(),
            }.get(url)

        helpers.fetch_page = Mock(side_effect=fetch)
        previous = sys.modules.get("utils")
        try:
            with patch.dict(sys.modules, {"utils": helpers}):
                scraper.scrape()
        finally:
            if previous is None:
                sys.modules.pop("utils", None)
            else:
                sys.modules["utils"] = previous

        helpers.update_compatibility_info.assert_called_once()
        path, rows = helpers.update_compatibility_info.call_args.args
        self.assertEqual(path, scraper.OUTPUT_PATH)
        self.assertEqual(rows[0]["version"], "1.7.1")


if __name__ == "__main__":
    unittest.main()
