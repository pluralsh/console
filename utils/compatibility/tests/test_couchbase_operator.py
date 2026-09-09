"""Offline checks: python -m unittest discover -s tests -p 'test_couchbase_operator.py'."""

import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import yaml

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "couchbase_operator_scraper", COMPATIBILITY / "scrapers/couchbase-operator.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
import summarizer
import utils
FIXTURES = Path(__file__).parent / "fixtures/couchbase-operator"


class CouchbaseOperatorTests(unittest.TestCase):
    def setUp(self):
        self.pages = {minor: (FIXTURES / f"{minor}.html").read_bytes()
                      for minor in ("2.9", "2.8", "2.7", "2.6", "2.5")}
        self.index = (FIXTURES / "index.yaml").read_bytes()
        self.sources = {
            f"{scraper.docs_url}/current/{scraper.page_name}": self.pages["2.9"],
            f"{scraper.helm_repository_url}/index.yaml": self.index,
            **{f"{scraper.docs_url}/{minor}/{scraper.page_name}": page
               for minor, page in self.pages.items()},
        }
        self.existing = {"versions": []}

    def run_scrape(self):
        with patch.object(scraper, "fetch_page", side_effect=self.sources.get) as fetch, \
                patch.object(scraper, "read_yaml", return_value=self.existing), \
                patch.object(scraper, "update_compatibility_info") as update, \
                patch.object(scraper, "print_error"):
            scraper.scrape()
        return update, fetch

    def test_real_tables_keep_each_release_range_and_exclude_openshift(self):
        limits = {"2.9": (31, 35), "2.8": (29, 34), "2.7": (26, 34),
                  "2.6": (25, 32), "2.5": (24, 28)}
        for minor, (first, last) in limits.items():
            with self.subTest(minor=minor):
                self.assertEqual(scraper.kubernetes_versions(self.pages[minor], minor),
                                 [f"1.{n}" for n in range(last, first - 1, -1)])

    def test_real_chart_pairs_select_latest_stable_patch_for_published_families(self):
        minors = scraper.documented_versions(self.pages["2.9"])
        self.assertEqual(minors, set(self.pages))
        self.assertEqual(scraper.latest_charts(self.index, minors), {
            "2.9": ("2.9.3", "2.93.0"), "2.8": ("2.8.2", "2.82.0"),
            "2.7": ("2.7.1", "2.71.0"), "2.6": ("2.6.4", "2.64.1"),
            "2.5": ("2.5.0", "2.50.4"),
        })
        # Older chart families remain in the index but are not published in the selector.
        self.assertIn(b'appVersion: 2.4.2', self.index)

    def test_chart_selection_is_order_independent_and_rejects_prereleases(self):
        index = yaml.safe_load(self.index)
        entries = index["entries"][scraper.app_name]
        entries.reverse()
        entries[:0] = [
            {"appVersion": "2.9.4-rc.1", "version": "2.94.0"},
            {"appVersion": "2.9.4", "version": "2.94.0-beta.1"},
            {"appVersion": "2.9.4", "version": "2.94.0", "deprecated": True},
            {"appVersion": "2.9.3", "version": "2.93.1-rc.1"},
            {"appVersion": "2.10.0", "version": "2.100.0"},
        ]
        self.assertEqual(scraper.latest_charts(yaml.safe_dump(index), {"2.9"}),
                         {"2.9": ("2.9.3", "2.93.0")})

    def test_missing_wrong_and_unbounded_tables_fail_closed(self):
        page = self.pages["2.9"]
        variants = [
            page.replace(b'id="table-operator-compatibility"', b'id="another-table"'),
            page.replace(b'Open Source Kubernetes', b'Google Kubernetes Engine'),
            page.replace(b'1.31 - 1.35', b'1.31+'),
            page.replace(b'1.31 - 1.35', b'1.35 - 1.31'),
            page.replace(b'1.31 - 1.35', b'1.31 - 1.35*'),
        ]
        for content in variants:
            with self.subTest(content=content):
                with self.assertRaises(ValueError):
                    scraper.kubernetes_versions(content, "2.9")

    def test_redirect_to_current_cannot_supply_historical_compatibility(self):
        with self.assertRaises(ValueError):
            scraper.kubernetes_versions(self.pages["2.9"], "2.8")

    def test_full_scrape_adds_five_exact_versions(self):
        update, fetch = self.run_scrape()
        update.assert_called_once()
        rows = update.call_args.args[1]
        self.assertEqual([row["version"] for row in rows],
                         ["2.9.3", "2.8.2", "2.7.1", "2.6.4", "2.5.0"])
        self.assertEqual(rows[0]["chart_version"], "2.93.0")
        self.assertEqual(rows[-1]["kube"], ["1.28", "1.27", "1.26", "1.25", "1.24"])
        self.assertEqual(fetch.call_count, 7)

    def test_failed_or_redirected_page_prevents_partial_write(self):
        for content in (None, self.pages["2.9"]):
            with self.subTest(content=content):
                self.sources[f"{scraper.docs_url}/2.8/{scraper.page_name}"] = content
                update, _ = self.run_scrape()
                update.assert_not_called()

    def test_discovery_failure_prevents_write(self):
        self.sources[f"{scraper.docs_url}/current/{scraper.page_name}"] = b'<html>No versions</html>'
        update, _ = self.run_scrape()
        update.assert_not_called()

    def test_empty_index_and_unreadable_catalog_prevent_write(self):
        self.sources[f"{scraper.helm_repository_url}/index.yaml"] = b'entries: {}'
        update, _ = self.run_scrape()
        update.assert_not_called()
        self.existing = None
        update, fetch = self.run_scrape()
        update.assert_not_called()
        fetch.assert_not_called()

    def test_recorded_release_is_preserved_when_family_docs_change(self):
        old = {"version": "2.9.3", "chart_version": "2.93.0", "kube": ["1.31"]}
        self.existing["versions"].append(old)
        update, fetch = self.run_scrape()
        self.assertNotIn("2.9.3", [row["version"] for row in update.call_args.args[1]])
        self.assertEqual(old["kube"], ["1.31"])
        self.assertNotIn(f"{scraper.docs_url}/2.9/{scraper.page_name}",
                         [call.args[0] for call in fetch.call_args_list])

    def test_new_chart_for_recorded_operator_preserves_historical_range(self):
        old = {"version": "2.6.4", "chart_version": "2.64.0", "kube": ["1.25"],
               "summary": {"features": ["Previously recorded"]}, "images": ["previous-chart:old"]}
        self.existing["versions"].append(old)
        update, fetch = self.run_scrape()
        row = next(row for row in update.call_args.args[1] if row["version"] == "2.6.4")
        self.assertEqual(row, {**old, "chart_version": "2.64.1", "images": []})
        self.assertEqual(old["chart_version"], "2.64.0")
        self.assertEqual(old["images"], ["previous-chart:old"])
        self.assertNotIn(f"{scraper.docs_url}/2.6/{scraper.page_name}",
                         [call.args[0] for call in fetch.call_args_list])

        # The shared writer keeps a row when rendering yields no images. It must
        # not publish the previous chart's images alongside the new chart version.
        with patch.object(utils, "read_yaml", return_value={
            "versions": [old], "helm_repository_url": scraper.helm_repository_url,
        }), patch.object(utils, "get_chart_images", return_value=None), \
                patch.object(utils, "summarization_enabled", return_value=False), \
                patch.object(utils, "write_yaml", return_value=True) as write, \
                patch.object(utils, "print_success"), patch.object(utils, "print_warning"):
            utils.update_compatibility_info(scraper.filepath, [row])
        written = write.call_args.args[1]["versions"][0]
        self.assertEqual(written["chart_version"], "2.64.1")
        self.assertEqual(written["images"], [])

    def test_catalog_writer_keeps_data_without_fetching_wrong_release_summaries(self):
        catalog_path = COMPATIBILITY.parents[1] / "static/compatibilities/couchbase-operator.yaml"
        catalog = yaml.safe_load(catalog_path.read_text(encoding="utf-8"))
        rows = [{"version": "2.9.3", "chart_version": "2.93.0", "kube": ["1.35"]},
                {"version": "2.8.2", "chart_version": "2.82.0", "kube": ["1.34"]}]
        catalog["versions"] = []
        with patch.object(utils, "read_yaml", return_value=catalog), \
                patch.object(utils, "get_chart_images", return_value=[]), \
                patch.object(utils, "summarization_enabled", return_value=True), \
                patch.object(utils, "write_yaml", return_value=True) as write, \
                patch.object(utils, "print_success"), \
                patch.object(summarizer, "fetch_page") as fetch, \
                patch.object(summarizer, "_get_exa") as exa, \
                patch.object(summarizer, "_get_oai_client") as oai:
            utils.update_compatibility_info(scraper.filepath, rows)
        write.assert_called_once()
        self.assertEqual(len(write.call_args.args[1]["versions"]), 2)
        self.assertTrue(all(row["summary"] is None for row in write.call_args.args[1]["versions"]))
        fetch.assert_not_called()
        exa.assert_not_called()
        oai.assert_not_called()

    def test_other_addons_keep_the_existing_release_summary_fetch(self):
        for extra in ({}, {"skip_release_summary": False}):
            with self.subTest(extra=extra), patch.object(summarizer, "_get_exa") as exa, \
                    patch.object(summarizer, "_get_oai_client") as oai:
                exa.return_value.get_contents.return_value.results = []
                summarizer.helm_summary("another-addon", {
                    "release_url": "https://example.com/releases/{vsn}", **extra,
                }, {"version": "1.0.0", "chart_version": "1.0.0"},
                   {"version": "1.1.0", "chart_version": "1.1.0"})
                urls = exa.return_value.get_contents.call_args.args[0]
                self.assertEqual(set(urls), {"https://example.com/releases/1.0.0",
                                             "https://example.com/releases/1.1.0"})
                oai.assert_not_called()


if __name__ == "__main__":
    unittest.main()
