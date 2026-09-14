"""Offline source parsing, real chart matching, and history regressions."""

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

scraper = importlib.import_module("scrapers.dynatrace-operator")
FIXTURES = Path(__file__).parent / "fixtures"
SUPPORT = (FIXTURES / "dynatrace-support.html").read_bytes()
INDEX = (FIXTURES / "dynatrace-index.yaml").read_bytes()


def table(rows, headers=None):
    headers = headers or ["Kubernetes upstream version", "Recommended Dynatrace Operator version"]
    return "<table><tr>" + "".join(f"<th>{header}</th>" for header in headers) + "</tr>" + "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in rows
    ) + "</table>"


def index(entries):
    return yaml.safe_dump({"entries": {scraper.APP_NAME: entries}})


def row(version, kube=None):
    return {"version": version, "kube": kube or ["1.35"], "chart_version": version,
            "requirements": [{"name": "existing", "version": ">=1.0.0"}],
            "incompatibilities": [], "summary": "Preserved history", "images": []}


class SupportTableTests(unittest.TestCase):
    def test_vendor_fixture_recommendation_includes_later_released_minor(self):
        recommendations = scraper.parse_support_table(SUPPORT)
        self.assertEqual(set(recommendations), {f"1.{minor}" for minor in range(27, 37)})
        for rule in recommendations.values():
            self.assertFalse(scraper._matches((1, 8, 1), rule))
            self.assertTrue(scraper._matches((1, 9, 0), rule))
            self.assertTrue(scraper._matches((1, 10, 2), rule))

    def test_exact_and_wildcard_recommendations_do_not_expand_to_later_minors(self):
        rules = scraper.parse_support_table(table([
            ["1.35", "v1.9.x"], ["1.33", "v1.9.0"],
        ]))
        self.assertTrue(scraper._matches((1, 9, 2), rules["1.35"]))
        self.assertFalse(scraper._matches((1, 10, 0), rules["1.35"]))
        self.assertFalse(scraper._matches((1, 9, 2), rules["1.33"]))
        rows = scraper.build_rows(rules, {(1, 9, 0): (2, 0, 0)}, [])
        self.assertEqual(rows[0]["kube"], ["1.35", "1.33"])

    def test_unrelated_table_and_nested_markup_do_not_change_column_selection(self):
        content = table([["wrong", "v1.0.0"]], ["Other", "Column"]) + table([
            ["<span>1.36</span>", "<strong>v1.9.0+</strong>"],
        ])
        self.assertEqual(scraper.parse_support_table(content), {"1.36": ("at_least", (1, 9, 0))})

    def test_changed_or_ambiguous_source_fails_closed(self):
        sources = [
            "<p>No matrix</p>", table([]), table([["1.35"]]),
            table([["1.35 or later", "v1.9.0+"]]),
            table([["1.35", "v1.9.x+"]]), table([["1.35", "v1.9.0+ subject to review"]]),
            table([["1.35", "v1.9.0+"], ["1.35", "v1.10.0+"]]),
            table([["1.35", "v1.9.0+", "v1.9.0+"]], ["Kubernetes upstream version",
                  "Recommended Dynatrace Operator version", "Recommended Dynatrace Operator version"]),
        ]
        for content in sources:
            with self.subTest(content=content), self.assertRaises(ValueError):
                scraper.parse_support_table(content)


class ReleasedChartTests(unittest.TestCase):
    def test_vendor_chart_fixture_matches_actual_app_versions(self):
        charts = scraper.parse_helm_versions(INDEX)
        self.assertEqual(charts, {(1, 10, 2): (1, 10, 2), (1, 10, 0): (1, 10, 0),
                                  (1, 9, 0): (1, 9, 0), (1, 8, 1): (1, 8, 1)})

    def test_app_and_chart_versions_are_separate_and_latest_stable_chart_wins(self):
        charts = scraper.parse_helm_versions(index([
            {"appVersion": "v1.9.0", "version": "2.0.0"},
            {"appVersion": "1.9.0", "version": "2.0.1"},
            {"appVersion": "1.9.0", "version": "2.1.0-rc.1"},
            {"appVersion": "1.10.0-rc.1", "version": "3.0.0"},
            {"appVersion": "1.10.0", "version": "3.0.0", "deprecated": True},
            {"appVersion": "1.11.0", "version": "3.0"},
        ]))
        rows = scraper.build_rows(scraper.parse_support_table(SUPPORT), charts, [])
        self.assertEqual([(r["version"], r["chart_version"]) for r in rows], [("1.9.0", "2.0.1")])

    def test_missing_malformed_or_unreleased_chart_index_fails_closed(self):
        for content in ["null", "[]", "entries: []", "entries: {}", index([]), index([None]),
                        index([{"appVersion": "1.9.0", "version": "1.9.0-rc.1"}])]:
            with self.subTest(content=content), self.assertRaises(ValueError):
                scraper.parse_helm_versions(content)

    def test_minor_boundary_and_latest_patch_are_retained_after_matching_charts(self):
        charts = scraper.parse_helm_versions(INDEX)
        charts[(1, 10, 1)] = (1, 10, 1)
        existing = [row("1.8.1"), row("1.8.0")]
        before = deepcopy(existing)
        rows = scraper.build_rows(scraper.parse_support_table(SUPPORT), charts, existing)
        self.assertEqual({r["version"] for r in rows}, {"1.9.0", "1.10.0", "1.10.2"})
        self.assertEqual(existing, before)
        reduced = reduce_versions(existing + rows)
        self.assertNotIn("1.8.1", [r["version"] for r in reduced])
        self.assertEqual(next(r for r in reduced if r["version"] == "1.8.0"), existing[1])
        self.assertEqual(scraper.build_rows(scraper.parse_support_table(SUPPORT), charts, reduced), [])

    def test_missing_first_patch_uses_real_chart_without_inventing_zero_patch(self):
        rows = scraper.build_rows(scraper.parse_support_table(SUPPORT), {(1, 10, 2): (1, 10, 2)}, [])
        self.assertEqual([r["version"] for r in rows], ["1.10.2"])

    def test_late_chart_adds_earlier_minor_boundary_without_rewriting_history(self):
        existing = [row("1.10.2", ["1.36", "1.35"])]
        charts = {(1, 10, 0): (1, 10, 0), (1, 10, 2): (1, 10, 2)}
        rows = scraper.build_rows(scraper.parse_support_table(SUPPORT), charts, existing)
        self.assertEqual([r["version"] for r in rows], ["1.10.0"])
        self.assertEqual(existing[0]["kube"], ["1.36", "1.35"])


class ScrapeSafetyTests(unittest.TestCase):
    def test_http_error_timeout_or_changed_source_does_not_write(self):
        failures = [requests.Timeout("timeout"), requests.HTTPError("unavailable"),
                    [b"<p>Missing table</p>"], [SUPPORT, b"entries: {}"]]
        for failure in failures:
            with self.subTest(failure=failure), patch.object(scraper, "read_yaml", return_value={"versions": []}), \
                    patch.object(scraper, "_fetch", side_effect=failure), \
                    patch.object(scraper, "print_error"), patch.object(scraper, "update_compatibility_info") as write:
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

    def test_valid_sources_write_only_chart_backed_new_boundaries(self):
        with patch.object(scraper, "read_yaml", return_value={"versions": [row("1.8.0")]}), \
                patch.object(scraper, "_fetch", side_effect=[SUPPORT, INDEX]), \
                patch.object(scraper, "update_compatibility_info") as write:
            scraper.scrape()
            write.assert_called_once()
            self.assertEqual({r["version"] for r in write.call_args.args[1]}, {"1.9.0", "1.10.0", "1.10.2"})

    def test_http_requests_have_timeout_and_raise_on_unsuccessful_response(self):
        with patch.object(scraper.requests, "get") as get:
            get.return_value.content = b"fixture"
            self.assertEqual(scraper._fetch(scraper.SUPPORT_URL), b"fixture")
            get.assert_called_once_with(scraper.SUPPORT_URL, timeout=30)
            get.return_value.raise_for_status.assert_called_once_with()


class GeneratedDataTests(unittest.TestCase):
    def test_checked_in_rows_use_source_versions_and_match_aggregate(self):
        root = Path(__file__).resolve().parents[3]
        app = yaml.safe_load((root / "static/compatibilities/dynatrace-operator.yaml").read_text())
        aggregate = yaml.safe_load((root / "static/compatibilities.yaml").read_text())
        self.assertEqual(next(a for a in aggregate["addons"] if a["name"] == scraper.APP_NAME),
                         dict(app, name=scraper.APP_NAME))
        by_version = {entry["version"]: entry for entry in app["versions"]}
        for version in ["1.9.0", "1.10.0", "1.10.2"]:
            self.assertEqual(by_version[version]["chart_version"], version)
            self.assertEqual(by_version[version]["kube"], [f"1.{minor}" for minor in range(36, 26, -1)])
            self.assertEqual(by_version[version]["images"],
                             [f"public.ecr.aws/dynatrace/dynatrace-operator:v{version}"])


if __name__ == "__main__":
    unittest.main()
