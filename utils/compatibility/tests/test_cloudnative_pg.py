"""Offline regressions: python -m unittest discover -s tests -p 'test_cloudnative_pg.py'."""

from copy import deepcopy
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from bs4 import BeautifulSoup

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "cloudnative_pg_scraper", COMPATIBILITY / "scrapers/cloudnative-pg.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
FIXTURES = Path(__file__).parent / "fixtures/cloudnative-pg"


class CloudNativePGTests(unittest.TestCase):
    def setUp(self):
        self.html = (FIXTURES / "supported.html").read_bytes()
        self.sources = {
            f"{scraper.DOCS_ROOT}/": b'<link rel="canonical" href="/docs/1.30/">',
            f"{scraper.DOCS_ROOT}/1.30/supported_releases/": self.html,
            **{
                f"{scraper.RELEASE_DOCS}/v{version}/docs/src/supported_releases.md":
                (FIXTURES / f"release-{version}.md").read_bytes()
                for version in ("1.29.0", "1.30.0")
            },
        }
        self.existing = {"helm_repository_url": "https://charts.example.test", "chart_name": "cloudnative-pg",
                         "helm_values": "monitoring.enabled=true", "versions": [
                             {"version": "1.28.0", "kube": ["1.34", "1.33", "1.32"], "chart_version": "0.27.0"}]}
        self.charts = {"1.30.0": "0.29.0", "1.29.0": "0.28.0", "1.28.0": "0.27.0"}

    def run_scrape(self, images=("registry.example.test/operator:new",), error=None):
        with patch.object(scraper, "fetch_page", side_effect=self.sources.get) as fetch, \
                patch.object(scraper, "read_yaml", return_value=self.existing), \
                patch.object(scraper, "get_chart_versions", return_value=self.charts), \
                patch.object(scraper, "get_chart_images", return_value=list(images) if images else images,
                             side_effect=error), \
                patch.object(scraper, "print_error"), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        return update, fetch

    def test_versions_reject_prereleases_and_unrelated_text(self):
        for value in ("main", "1.31.0-rc1", "next 1.31", "1.30.0+build", "v1.30.x extra"):
            with self.subTest(value=value):
                self.assertIsNone(scraper.normalize_version(value))
        self.assertEqual(scraper.normalize_version("v1.30.x"), "1.30.0")
        self.assertEqual(scraper.normalize_version("1.29.2"), "1.29.2")

    def test_kubernetes_list_is_strict_and_deduplicated(self):
        self.assertEqual(scraper.normalize_kube_list("1.35, v1.34, 1.35"), ["1.35", "1.34"])
        for value in ("1.34+", "1.34, unknown", "1.34 - 1.36", "1.34,", "", "1.34.1"):
            with self.subTest(value=value):
                self.assertEqual(scraper.normalize_kube_list(value), [])

    def test_header_selects_supported_column_after_reordering(self):
        table = BeautifulSoup(
            '<table><thead><tr><th>Version</th><th>Tested, but not supported</th>'
            '<th>Supported Kubernetes versions</th></tr></thead><tbody><tr>'
            '<td>1.30.x</td><td>1.33, 1.32</td><td>1.35, 1.36</td>'
            '</tr></tbody></table>', "html.parser"
        ).table
        self.assertEqual(scraper.parse_table_rows(table)[0]["kube"], ["1.36", "1.35"])

    def test_heading_cannot_capture_a_later_unrelated_table(self):
        soup = BeautifulSoup('<h2 id="old-releases">Old</h2><h2>Upcoming</h2><table></table>', "html.parser")
        self.assertIsNone(scraper.find_table(soup, "old-releases"))

    def test_release_tag_selects_supported_instead_of_tested(self):
        for version, expected in (("1.29.0", ["1.35", "1.34", "1.33"]), ("1.30.0", ["1.36", "1.35", "1.34"])):
            content = (FIXTURES / f"release-{version}.md").read_bytes()
            self.assertEqual(scraper.release_kube_versions(content, version), expected)

    def test_invalid_release_tag_matrix_fails_closed(self):
        source = (FIXTURES / "release-1.30.0.md").read_bytes()
        for content in (b"# Missing", source.replace(b"1.34, 1.35, 1.36", b"1.34+"), source.replace(b"1.30.x", b"1.31.x")):
            with self.subTest(content=content):
                with self.assertRaises(ValueError):
                    scraper.release_kube_versions(content, "1.30.0")

    def test_scrape_adds_only_two_released_versions_with_exact_charts(self):
        update, fetch = self.run_scrape()
        update.assert_called_once()
        versions = update.call_args.args[1]
        self.assertEqual([v["version"] for v in versions], ["1.30.0", "1.29.0"])
        self.assertEqual([v["chart_version"] for v in versions], ["0.29.0", "0.28.0"])
        self.assertEqual(versions[1]["kube"], ["1.35", "1.34", "1.33"])
        self.assertFalse(any("devel" in call.args[0] for call in fetch.call_args_list))
        self.assertEqual(self.existing["versions"][0]["kube"], ["1.34", "1.33", "1.32"])

    def test_release_tag_overrides_later_patch_support_in_moving_docs(self):
        url = f"{scraper.DOCS_ROOT}/1.30/supported_releases/"
        self.sources[url] = self.html.replace(b"1.33, 1.34, 1.35</td>", b"1.33, 1.34, 1.35, 1.36</td>")
        update, _ = self.run_scrape()
        self.assertEqual(update.call_args.args[1][1]["kube"], ["1.35", "1.34", "1.33"])

    def test_docusaurus_omitted_optional_closing_tags(self):
        minified = self.html
        for tag in (b"</th>", b"</td>", b"</tr>", b"</thead>", b"</tbody>"):
            minified = minified.replace(tag, b"")
        self.sources[f"{scraper.DOCS_ROOT}/1.30/supported_releases/"] = minified
        update, _ = self.run_scrape()
        self.assertEqual([v["version"] for v in update.call_args.args[1]], ["1.30.0", "1.29.0"])

    def test_discovery_failure_never_uses_development_or_writes(self):
        self.sources[f"{scraper.DOCS_ROOT}/"] = b'<a href="/docs/devel/">Preview</a>'
        update, fetch = self.run_scrape()
        update.assert_not_called()
        self.assertEqual(fetch.call_count, 1)

    def test_missing_or_invalid_page_never_writes(self):
        for source in (None, b"<html>No matrix</html>", self.html.replace(b"1.34, 1.35, 1.36", b"1.34+")):
            with self.subTest(source=source):
                self.sources[f"{scraper.DOCS_ROOT}/1.30/supported_releases/"] = source
                update, _ = self.run_scrape()
                update.assert_not_called()

    def test_missing_release_tag_prevents_partial_batch_write(self):
        self.sources[f"{scraper.RELEASE_DOCS}/v1.29.0/docs/src/supported_releases.md"] = None
        update, _ = self.run_scrape()
        update.assert_not_called()

    def test_missing_or_prerelease_charts_cannot_create_ga_records(self):
        for charts in ({}, {"1.30.0": "0.29.0-rc1", "1.29.1": "0.28.1"}):
            with self.subTest(charts=charts):
                self.charts = charts
                update, _ = self.run_scrape()
                update.assert_not_called()

    def test_existing_versions_make_rerun_a_noop(self):
        update, _ = self.run_scrape()
        self.existing["versions"].extend(update.call_args.args[1])
        update, _ = self.run_scrape()
        update.assert_not_called()

    def recorded_release(self):
        update, _ = self.run_scrape()
        self.existing["versions"].extend(update.call_args.args[1])
        saved = next(row for row in self.existing["versions"] if row["version"] == "1.30.0")
        saved.update(summary={"updates": "Keep custom notes"}, eolAt="2027-01-01",
                     requirements=[{"name": "existing", "version": ">=1.0.0"}],
                     incompatibilities=[{"name": "other", "version": "<2.0.0"}],
                     images=["registry.example.test/operator:old"])
        return saved

    def test_newer_exact_chart_preserves_full_metadata_then_becomes_noop(self):
        saved = self.recorded_release()
        before = deepcopy(self.existing)
        self.charts["1.30.0"] = "0.29.1"
        update, fetch = self.run_scrape()
        refreshed, = update.call_args.args[1]
        self.assertEqual(refreshed, dict(saved, chart_version="0.29.1",
                                         images=["registry.example.test/operator:new"]))
        self.assertEqual(self.existing, before)
        self.assertFalse(any("raw.githubusercontent.com" in call.args[0] for call in fetch.call_args_list))
        saved.update(refreshed)
        update, _ = self.run_scrape()
        update.assert_not_called()

    def test_missing_chart_is_backfilled_without_duplicate_version(self):
        saved = self.recorded_release()
        saved.pop("chart_version")
        update, _ = self.run_scrape()
        refreshed, = update.call_args.args[1]
        self.assertEqual(refreshed["chart_version"], "0.29.0")
        self.assertEqual(refreshed["kube"], saved["kube"])
        self.assertEqual(refreshed["summary"], saved["summary"])

    def test_recorded_chart_cannot_downgrade_or_use_prerelease_or_other_app(self):
        self.recorded_release()
        for chart in ("0.28.9", "0.29.0", "0.29.1-rc.1", "0.29.1+build", "0.30"):
            with self.subTest(chart=chart):
                self.charts = {"1.30.0": chart, "1.30.1": "0.29.2"}
                update, _ = self.run_scrape()
                update.assert_not_called()
        self.charts = {"1.30.1": "0.29.2"}
        update, _ = self.run_scrape()
        update.assert_not_called()

    def test_failed_new_chart_render_keeps_entire_saved_record(self):
        self.recorded_release()
        before = deepcopy(self.existing)
        self.charts["1.30.0"] = "0.29.1"
        for images, error in ((None, None), ([], None), (None, OSError("helm unavailable"))):
            with self.subTest(images=images, error=error):
                update, _ = self.run_scrape(images=images, error=error)
                update.assert_not_called()
                self.assertEqual(self.existing, before)

    def test_failed_refresh_does_not_block_another_successful_chart(self):
        self.recorded_release()
        self.charts.update({"1.30.0": "0.29.1", "1.29.0": "0.28.1"})
        before = deepcopy(self.existing)
        update, _ = self.run_scrape(error=[None, ["registry.example.test/operator:other"]])
        refreshed, = update.call_args.args[1]
        original = next(row for row in self.existing["versions"] if row["version"] == "1.29.0")
        self.assertEqual(refreshed, dict(original, chart_version="0.28.1",
                                         images=["registry.example.test/operator:other"]))
        self.assertEqual(self.existing, before)

    def test_unreadable_existing_file_never_writes(self):
        self.existing = None
        update, _ = self.run_scrape()
        update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
