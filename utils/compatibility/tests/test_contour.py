"""Offline regression coverage for official compatibility without a matching chart."""

from copy import deepcopy
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location("contour_scraper", COMPATIBILITY / "scrapers/contour.py")
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
from utils import reduce_versions
from packaging.version import Version

FIXTURES = Path(__file__).parent / "fixtures/contour"


class ContourTests(unittest.TestCase):
    def setUp(self):
        self.html = (FIXTURES / "matrix.html").read_bytes()
        self.sources = {scraper.compatibility_url: self.html}
        for version in ("1.33.0", "1.33.7"):
            self.sources[scraper.release_manifest_url.format(version=version)] = (FIXTURES / f"release-{version}.yaml").read_bytes()
        self.existing = {"versions": [
            {"version": version, "kube": ["1.33", "1.32", "1.31"], "chart_version": chart,
             "images": [f"docker.io/bitnami/contour:{version}"], "requirements": [], "incompatibilities": []}
            for version, chart in (("1.32.1", "21.1.4"), ("1.32.0", "21.1.2"))
        ]}
        self.charts = {"1.32.1": "21.1.4"}

    def parse(self, html=None):
        return scraper.extract_table_data(scraper.find_target_tables(scraper.parse_page(html or self.html)))

    def run_scrape(self):
        with patch.object(scraper, "fetch_page", side_effect=self.sources.get), \
                patch.object(scraper, "read_yaml", return_value=self.existing), \
                patch.object(scraper, "get_chart_versions", return_value=self.charts), \
                patch.object(scraper, "print_error"), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        return update

    def test_current_table_parses_explicit_supported_versions_only(self):
        rows = self.parse()
        self.assertNotIn("main", [row["version"] for row in rows])
        self.assertEqual(rows[0]["version"], "1.33.7")
        self.assertEqual(rows[0]["kube"], ["1.34", "1.33", "1.32"])
        self.assertNotIn("1.37", rows[0]["kube"])

    def test_columns_are_selected_by_label(self):
        html = '<h2>Compatibility Matrix</h2><table><tr><th>Kubernetes Versions</th><th>Contour Version</th></tr>'
        html += '<tr><td>1.32,1.34, 1.33,1.34</td><td>1.33.0</td></tr></table>'
        self.assertEqual(self.parse(html)[0]["kube"], ["1.34", "1.33", "1.32"])

    def test_prereleases_and_partial_versions_are_excluded(self):
        for version in (b"1.33.7-rc1", b"1.33.7+build", b"next 1.33.7"):
            html = self.html.replace(b">1.33.7<", b">" + version + b"<")
            self.assertNotIn("1.33.7", [row["version"] for row in self.parse(html)])

    def test_malformed_kubernetes_values_never_partially_parse(self):
        for value in (b"1.32+", b"1.32,unknown", b"1.32 - 1.34", b""):
            with self.subTest(value=value):
                html = self.html.replace(b"1.34, 1.33, 1.32", value)
                with self.assertRaises(ValueError):
                    self.parse(html)

    def test_missing_headers_are_rejected(self):
        with self.assertRaises(ValueError):
            self.parse(self.html.replace(b"Kubernetes Versions", b"Dependency Version"))

    def test_no_chart_mapping_still_writes_verified_release_boundaries(self):
        self.charts = {}
        update = self.run_scrape()
        update.assert_called_once()
        rows = update.call_args.args[1]
        self.assertEqual([row["version"] for row in rows], ["1.33.7", "1.33.0"])
        for row in rows:
            self.assertNotIn("chart_version", row)
            self.assertIn(f'ghcr.io/projectcontour/contour:v{row["version"]}', row["images"])

    def test_only_exact_stable_chart_mapping_is_attached(self):
        self.charts = {"1.33.7": "22.0.0", "1.33.0": "22.0.0-rc1", "1.34.0": "23.0.0"}
        rows = self.run_scrape().call_args.args[1]
        self.assertEqual(rows[0]["chart_version"], "22.0.0")
        self.assertNotIn("chart_version", rows[1])

    def test_verified_release_images_survive_shared_reducer_without_chart(self):
        rows = self.run_scrape().call_args.args[1]
        reduced = reduce_versions(deepcopy(self.existing["versions"]) + rows)
        self.assertEqual(reduced[0]["images"], rows[0]["images"])
        self.assertNotIn("chart_version", reduced[0])
        self.assertEqual([row["version"] for row in reduced], ["1.33.7", "1.33.0", "1.32.1", "1.32.0"])
        self.assertEqual(reduced[-1]["images"], self.existing["versions"][-1]["images"])

    def test_chart_update_consumer_retains_latest_chart_when_new_releases_lack_charts(self):
        # observer/poller.ex filters by Kubernetes support and considers only
        # chart_version for chart updates, so a newer manifest cannot replace it.
        def latest_chart(rows, kube):
            return max(Version(row["chart_version"]) for row in rows
                       if kube in row["kube"] and row.get("chart_version"))

        rows = self.run_scrape().call_args.args[1]
        reduced = reduce_versions(deepcopy(self.existing["versions"]) + rows)
        self.assertEqual(latest_chart(self.existing["versions"], "1.33"), Version("21.1.4"))
        self.assertEqual(latest_chart(reduced, "1.33"), Version("21.1.4"))
        self.assertIn("1.33.0", [row["version"] for row in reduced])
        self.assertIn("1.33.7", [row["version"] for row in reduced])

    def test_all_chart_reduction_still_drops_redundant_intermediate_patches(self):
        rows = [
            {"version": version, "kube": ["1.33"], "chart_version": chart}
            for version, chart in (("1.32.0", "21.1.2"), ("1.32.1", "21.1.4"), ("1.32.2", "21.1.5"))
        ]
        self.assertEqual([row["version"] for row in reduce_versions(rows)], ["1.32.2", "1.32.0"])

    def test_reducer_keeps_chart_image_default_and_absent_metadata_behavior(self):
        with_chart = {"version": "1.0.0", "kube": ["1.30"], "chart_version": "2.0.0"}
        self.assertEqual(reduce_versions([with_chart])[0]["images"], [])
        without_chart = {"version": "1.0.0", "kube": ["1.30"]}
        self.assertNotIn("images", reduce_versions([without_chart])[0])

    def test_reducer_preserves_existing_end_of_life_dates(self):
        existing = {"version": "1.30.0", "kube": ["1.30"], "eolAt": "2025-09-08"}
        reduced = reduce_versions([existing])[0]
        self.assertEqual(reduced["eolAt"], "2025-09-08")
        self.assertNotIn("eolAt", reduce_versions([{"version": "1.33.0", "kube": ["1.34"]}])[0])

    def test_manifest_images_are_from_pod_definitions(self):
        source = (FIXTURES / "release-1.33.0.yaml").read_bytes()
        source += b'\n---\nkind: CustomResourceDefinition\nspec:\n  properties:\n    image: {type: string}\n'
        self.assertEqual(scraper.release_images(source, "1.33.0"), [
            "docker.io/envoyproxy/envoy:distroless-v1.35.2", "ghcr.io/projectcontour/contour:v1.33.0",
        ])

    def test_mismatched_release_manifest_is_rejected(self):
        source = (FIXTURES / "release-1.33.0.yaml").read_bytes()
        with self.assertRaises(ValueError):
            scraper.release_images(source, "1.33.7")

    def test_missing_second_release_manifest_aborts_entire_batch(self):
        self.sources[scraper.release_manifest_url.format(version="1.33.0")] = None
        self.run_scrape().assert_not_called()

    def test_malformed_manifest_aborts_entire_batch(self):
        self.sources[scraper.release_manifest_url.format(version="1.33.7")] = b'not: [valid'
        self.run_scrape().assert_not_called()

    def test_missing_matrix_or_existing_file_never_writes(self):
        self.sources[scraper.compatibility_url] = b'<html>No matrix</html>'
        self.run_scrape().assert_not_called()
        self.sources[scraper.compatibility_url] = self.html
        self.existing = None
        self.run_scrape().assert_not_called()

    def test_complete_existing_records_make_rerun_a_noop(self):
        first = self.run_scrape()
        self.existing["versions"] = reduce_versions(self.existing["versions"] + deepcopy(first.call_args.args[1]))
        self.run_scrape().assert_not_called()

    def test_missing_older_boundary_can_be_added_after_latest_patch(self):
        first = self.run_scrape().call_args.args[1]
        self.existing["versions"].append(deepcopy(first[0]))
        rows = self.run_scrape().call_args.args[1]
        self.assertEqual([row["version"] for row in rows], ["1.33.0"])


if __name__ == "__main__":
    unittest.main()
