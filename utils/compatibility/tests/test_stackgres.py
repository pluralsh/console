"""Regressions using release metadata captured from StackGres's real index."""

import importlib.util
from pathlib import Path
import sys
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("stackgres_scraper", ROOT / "scrapers/stackgres.py")
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
FIXTURE = Path(__file__).parent / "fixtures/stackgres/index.yaml"

from utils import ensure_keys, reduce_versions


class StackGresTests(unittest.TestCase):
    def setUp(self):
        self.index = yaml.safe_load(FIXTURE.read_bytes())

    def rows(self):
        return scraper.build_rows(yaml.safe_dump(self.index))

    def test_real_release_bounds_include_both_endpoints(self):
        rows = self.rows()
        self.assertEqual(rows[0]["version"], "1.19.0")
        self.assertEqual(rows[0]["chart_version"], "1.19.0")
        self.assertEqual(rows[0]["kube"], [f"1.{v}" for v in range(36, 24, -1)])
        self.assertEqual(rows[-1]["version"], "1.5.0")
        self.assertEqual(rows[-1]["kube"], [f"1.{v}" for v in range(27, 17, -1)])

    def test_patch_level_support_changes_are_not_overwritten_by_latest_docs(self):
        rows = {row["version"]: row for row in self.rows()}
        self.assertEqual(rows["1.18.2"]["kube"][0], "1.34")
        self.assertEqual(rows["1.18.3"]["kube"][0], "1.35")
        self.assertEqual(rows["1.17.3"]["kube"][0], "1.33")
        self.assertEqual(rows["1.17.4"]["kube"][0], "1.34")
        self.assertNotIn("1.36", rows["1.18.8"]["kube"])

    def test_prereleases_and_undocumented_historical_charts_are_excluded(self):
        versions = [row["version"] for row in self.rows()]
        self.assertNotIn("1.19.0-rc3", versions)
        self.assertNotIn("1.4.3", versions)
        self.assertEqual(len(versions), 7)

    def test_catalog_reducer_preserves_patch_support_transitions(self):
        rows = reduce_versions([ensure_keys(row) for row in self.rows()])
        versions = [row["version"] for row in rows]
        self.assertIn("1.18.2", versions)
        self.assertIn("1.18.3", versions)
        self.assertIn("1.17.3", versions)
        self.assertIn("1.17.4", versions)
        self.assertNotIn("1.18.8", versions)
        self.assertEqual(versions[0], "1.19.0")

    def test_index_order_and_identical_duplicates_do_not_change_output(self):
        expected = self.rows()
        charts = self.index["entries"][scraper.CHART_NAME]
        charts.append(dict(charts[0]))
        charts.reverse()
        self.assertEqual(self.rows(), expected)

    def test_unknown_and_unbounded_ranges_fail_before_catalog_update(self):
        for constraint in [">=1.18.0", "1.18.0 - 1.35.0", "1.36.0-0 - 1.25.x-0", "1.18.0-0 - 2.0.x-0", "garbage", 135, ""]:
            with self.subTest(constraint=constraint), self.assertRaises(ValueError):
                self.index["entries"][scraper.CHART_NAME][0]["kubeVersion"] = constraint
                self.rows()

    def test_conflicting_duplicate_metadata_is_rejected(self):
        charts = self.index["entries"][scraper.CHART_NAME]
        conflicting = dict(charts[0], kubeVersion="1.18.0-0 - 1.36.x-0")
        charts.append(conflicting)
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            self.rows()

    def test_malformed_or_empty_indices_do_not_generate_rows(self):
        for index in [None, [], {}, {"entries": []}, {"entries": {scraper.CHART_NAME: []}}, {"entries": {scraper.CHART_NAME: [None]}}]:
            with self.subTest(index=index), self.assertRaises(ValueError):
                scraper.build_rows(yaml.safe_dump(index))

    def test_all_missing_bounds_is_an_error(self):
        self.index["entries"][scraper.CHART_NAME] = [self.index["entries"][scraper.CHART_NAME][-1]]
        with self.assertRaisesRegex(ValueError, "No stable StackGres"):
            self.rows()


if __name__ == "__main__":
    unittest.main()
