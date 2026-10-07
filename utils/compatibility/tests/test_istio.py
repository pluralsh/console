"""Offline coverage for the Istio repository migration and supported release join."""

from copy import deepcopy
import importlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import requests
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils import reduce_versions

scraper = importlib.import_module("scrapers.istio")
FIXTURES = Path(__file__).parent / "fixtures/istio"
SUPPORT = (FIXTURES / "support.html").read_bytes()
INDEX = (FIXTURES / "index.yaml").read_bytes()


def table(rows, headers=None):
    headers = headers or ["Version", "Currently Supported", "Supported Kubernetes Versions"]
    return "<table><tr>" + "".join(f"<th>{header}</th>" for header in headers) + "</tr>" + "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in rows
    ) + "</table>"


def historical(version):
    return {"version": version, "kube": ["1.36", "1.35", "1.34", "1.33", "1.32"],
            "chart_version": version, "requirements": [{"name": "existing", "version": ">=1.0.0"}],
            "incompatibilities": [], "summary": "Preserved history", "images": [f"istio/pilot:{version}"],
            "eolAt": "2026-12-31"}


class IstioTests(unittest.TestCase):
    def test_official_table_uses_supported_not_merely_tested_column(self):
        supported = scraper.parse_support_table(SUPPORT)
        self.assertEqual(set(supported), {(1, 31), (1, 30), (1, 29)})
        self.assertEqual(supported[(1, 31)], ["1.36", "1.35", "1.34", "1.33", "1.32"])
        self.assertNotIn("1.31", supported[(1, 31)])

    def test_columns_are_selected_by_label_and_whitespace_is_normalized(self):
        html = table([["1.35, 1.36,1.35", "<span>1.31</span>", "YES"]],
                     ["Supported Kubernetes Versions", "Version", "Currently Supported"])
        self.assertEqual(scraper.parse_support_table(html), {(1, 31): ["1.36", "1.35"]})

    def test_empty_matching_table_does_not_hide_later_source(self):
        self.assertEqual(scraper.parse_support_table(table([]) + table([["1.31", "Yes", "1.36"]])),
                         {(1, 31): ["1.36"]})

    def test_malformed_ambiguous_or_missing_support_aborts(self):
        sources = ["<p>Missing table</p>", table([]), table([["1.31", "Yes"]]),
                   table([["1.31", "Yes", "1.36+"]]), table([["1.31", "Yes", "1.32–1.36"]]),
                   table([["1.31.0-rc.0", "Yes", "1.36"]]),
                   table([["1.31", "Yes", "1.36"], ["1.31", "Yes", "1.35"]]),
                   table([["1.31", "Yes", "1.36", "1.35"]],
                         ["Version", "Currently Supported", "Supported Kubernetes Versions", "Supported Kubernetes Versions"])]
        for source in sources:
            with self.subTest(source=source), self.assertRaises(ValueError):
                scraper.parse_support_table(source)

    def test_official_index_contains_released_istiod_chart(self):
        charts = scraper.parse_chart_index(INDEX)
        self.assertEqual(charts, {(1, 31, 0): (1, 31, 0), (1, 30, 0): (1, 30, 0)})

    def test_exact_app_and_chart_versions_are_separate_and_stable(self):
        entries = [{"appVersion": "1.31.0", "version": "2.0.0"},
                   {"appVersion": "1.31.0", "version": "2.0.1"},
                   {"appVersion": "1.31.0", "version": "2.1.0-rc.1"},
                   {"appVersion": "1.32.0-rc.0", "version": "3.0.0"},
                   {"appVersion": "1.32.0", "version": "3.0.0", "deprecated": True},
                   {"appVersion": "1.31", "version": "1.31.0"}]
        charts = scraper.parse_chart_index(yaml.safe_dump({"entries": {"istiod": entries}}))
        self.assertEqual(charts, {(1, 31, 0): (2, 0, 1)})

    def test_missing_or_invalid_index_aborts(self):
        for source in ["null", "entries: []", "entries: {}", "entries: {istiod: []}",
                       "entries: {istiod: [null]}",
                       "entries: {istiod: [{appVersion: 1.31.0-rc.0, version: 1.31.0-rc.0}]}"]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                scraper.parse_chart_index(source)

    def test_chart_gate_does_not_invent_zero_patch_or_future_series(self):
        rows = scraper.build_rows(scraper.parse_support_table(SUPPORT),
                                  {(1, 31, 1): (1, 31, 1), (1, 32, 0): (1, 32, 0)}, [])
        self.assertEqual([row["version"] for row in rows], ["1.31.1"])

    def test_new_boundary_preserves_all_historical_metadata(self):
        existing = [historical("1.30.0")]
        before = deepcopy(existing)
        rows = scraper.build_rows(scraper.parse_support_table(SUPPORT), scraper.parse_chart_index(INDEX), existing)
        self.assertEqual([row["version"] for row in rows], ["1.31.0"])
        self.assertEqual(existing, before)
        reduced = reduce_versions(deepcopy(existing) + rows)
        self.assertEqual(reduced[-1], before[0])

    def test_redundant_patches_make_completed_rerun_a_noop(self):
        charts = {(1, 31, patch): (1, 31, patch) for patch in range(3)}
        supported = scraper.parse_support_table(SUPPORT)
        rows = scraper.build_rows(supported, charts, [historical("1.30.0")])
        self.assertEqual([row["version"] for row in rows], ["1.31.0", "1.31.2"])
        reduced = reduce_versions([historical("1.30.0")] + rows)
        self.assertEqual(scraper.build_rows(supported, charts, reduced), [])

    def test_late_chart_can_backfill_missing_boundary(self):
        existing = [historical("1.31.2")]
        rows = scraper.build_rows(scraper.parse_support_table(SUPPORT),
                                  {(1, 31, 0): (1, 31, 0), (1, 31, 2): (1, 31, 2)}, existing)
        self.assertEqual([row["version"] for row in rows], ["1.31.0"])

    def test_http_failure_or_changed_source_does_not_partially_write(self):
        for failure in [requests.Timeout("timeout"), requests.HTTPError("unavailable"),
                        [SUPPORT, b"entries: {}"], [b"<p>Missing table</p>"]]:
            with self.subTest(failure=failure), patch.object(scraper, "read_yaml", return_value={"versions": []}), \
                    patch.object(scraper, "_fetch", side_effect=failure), patch.object(scraper, "print_error"), \
                    patch.object(scraper, "update_compatibility_info") as write:
                scraper.scrape()
                write.assert_not_called()

    def test_invalid_existing_data_does_not_fetch_or_write(self):
        for existing in [None, [], {}, {"versions": None}]:
            with self.subTest(existing=existing), patch.object(scraper, "read_yaml", return_value=existing), \
                    patch.object(scraper, "_fetch") as fetch, patch.object(scraper, "print_error"), \
                    patch.object(scraper, "update_compatibility_info") as write:
                scraper.scrape()
                fetch.assert_not_called()
                write.assert_not_called()

    def test_scrape_uses_migrated_repository_and_only_writes_new_rows(self):
        with patch.object(scraper, "read_yaml", return_value={"versions": [historical("1.30.0")]}), \
                patch.object(scraper, "_fetch", side_effect=[SUPPORT, INDEX]) as fetch, \
                patch.object(scraper, "update_compatibility_info") as write:
            scraper.scrape()
            self.assertEqual(fetch.call_args_list[1].args[0], "https://blob.istio.io/istio-release/charts/index.yaml")
            self.assertEqual([row["version"] for row in write.call_args.args[1]], ["1.31.0"])

    def test_requests_have_timeout_and_raise_for_status(self):
        with patch.object(scraper.requests, "get") as get:
            get.return_value.content = b"fixture"
            self.assertEqual(scraper._fetch(scraper.chart_index_url), b"fixture")
            get.assert_called_once_with(scraper.chart_index_url, timeout=30)
            get.return_value.raise_for_status.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
