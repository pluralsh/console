import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

import yaml

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "volsync.py"
spec = importlib.util.spec_from_file_location("volsync", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
FIXTURE = Path(__file__).parent / "fixtures" / "volsync-index.yaml"


class VolSyncTests(unittest.TestCase):
    def setUp(self):
        self.index = FIXTURE.read_text()

    def test_historical_minimum_is_not_replaced_by_current_chart_constraint(self):
        rows = {r["version"]: r for r in scraper.build_rows(self.index, "1.22")}
        self.assertEqual(rows["0.3.0"]["kube"], ["1.22", "1.21", "1.20", "1.19", "1.18", "1.17"])
        self.assertEqual(rows["0.16.0"]["kube"], ["1.22", "1.21", "1.20"])

    def test_stable_releases_sorted_semantically_without_rcs(self):
        rows = scraper.build_rows(self.index, "1.20")
        self.assertEqual([r["version"] for r in rows], ["0.16.0", "0.9.1", "0.3.0"])
        self.assertEqual(rows[0]["chart_version"], "0.16.0")

    def test_single_minor_boundary_is_inclusive(self):
        self.assertEqual(scraper.declared_kube_versions("^1.20.0-0", "1.20"), ["1.20"])

    def test_cap_does_not_invent_future_minors(self):
        self.assertEqual(scraper.declared_kube_versions("^1.20.0-0", "1.21"), ["1.21", "1.20"])

    def test_unsupported_constraints_fail_closed(self):
        for constraint in [None, "", ">=1.20.0 <1.23.0", "^1.20.1-0", "^2.0.0-0", "^1.20.0-0 || ^2.0.0-0"]:
            with self.subTest(constraint=constraint), self.assertRaises(ValueError):
                scraper.declared_kube_versions(constraint, "1.36")

    def test_invalid_or_future_cap_fails_closed(self):
        for cap in [None, "", "garbage", "1.20.1", "2.0", "1.19"]:
            with self.subTest(cap=cap), self.assertRaises(ValueError):
                scraper.declared_kube_versions("^1.20.0-0", cap)

    def test_newest_chart_for_same_application_wins_independent_of_index_order(self):
        index = yaml.safe_load(self.index)
        entries = index["entries"]["volsync"]
        entries.extend([
            {"appVersion": "0.16.0", "version": "0.16.2", "kubeVersion": "^1.21.0-0"},
            {"appVersion": "0.16.0", "version": "0.16.1", "kubeVersion": "^1.20.0-0"},
        ])
        first = scraper.build_rows(yaml.safe_dump(index), "1.22")
        entries.reverse()
        self.assertEqual(first, scraper.build_rows(yaml.safe_dump(index), "1.22"))
        self.assertEqual(first[0]["chart_version"], "0.16.2")
        self.assertEqual(first[0]["kube"], ["1.22", "1.21"])

    def test_conflicting_duplicate_chart_version_fails_closed(self):
        index = yaml.safe_load(self.index)
        index["entries"]["volsync"].append({
            "appVersion": "0.16.0", "version": "0.16.0", "kubeVersion": "^1.21.0-0",
        })
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            scraper.build_rows(yaml.safe_dump(index), "1.22")

    def test_invalid_source_structure_fails_closed(self):
        for content in ["", "[]", "entries: []", "entries: {}", "entries: {volsync: [null]}", "entries: ["]:
            with self.subTest(content=content), self.assertRaises(ValueError):
                scraper.build_rows(content, "1.36")

    def test_excludes_nonstable_or_incomplete_application_and_chart_versions(self):
        for app, chart in [("0.16.0-rc.1", "0.16.0"), ("0.16.0", "0.16.0-rc.1"), ("0.16.0+build", "0.16.0"), ("0.16", "0.16.0"), (None, "0.16.0")]:
            content = yaml.safe_dump({"entries": {"volsync": [{
                "appVersion": app, "version": chart, "kubeVersion": "^1.20.0-0",
            }]}})
            with self.subTest(app=app, chart=chart), self.assertRaisesRegex(ValueError, "No stable"):
                scraper.build_rows(content, "1.36")

    def helpers(self, content):
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(return_value=content)
        helpers.current_kube_version = Mock(return_value="1.22")
        helpers.update_compatibility_info = Mock()
        return helpers

    def test_scrape_passes_verified_rows_to_existing_writer(self):
        helpers = self.helpers(self.index.encode())
        with patch.dict(sys.modules, {"utils": helpers}):
            scraper.scrape()
        helpers.fetch_page.assert_called_once_with(scraper.INDEX_URL)
        helpers.update_compatibility_info.assert_called_once_with(
            scraper.OUTPUT_PATH, scraper.build_rows(self.index, "1.22"),
        )

    def test_retrieval_or_parse_failure_never_calls_writer(self):
        for content in [None, b"", b"entries: [", b"\xff", b"entries: {}"]:
            helpers = self.helpers(content)
            with self.subTest(content=content), patch.dict(sys.modules, {"utils": helpers}):
                with self.assertRaises(ValueError):
                    scraper.scrape()
                helpers.update_compatibility_info.assert_not_called()

    def test_invalid_later_row_does_not_write_partial_results(self):
        index = yaml.safe_load(self.index)
        index["entries"]["volsync"].append({
            "appVersion": "0.17.0", "version": "0.17.0", "kubeVersion": "unknown",
        })
        helpers = self.helpers(yaml.safe_dump(index))
        with patch.dict(sys.modules, {"utils": helpers}), self.assertRaises(ValueError):
            scraper.scrape()
        helpers.update_compatibility_info.assert_not_called()


if __name__ == "__main__":
    unittest.main()
