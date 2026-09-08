import importlib
from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import jsonschema
import requests
import yaml

COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY_DIR))
scraper = importlib.import_module("scrapers.crunchy-postgres-operator")
FIXTURE = (
    Path(__file__).parent / "fixtures" / "crunchy-postgres-supported-platforms.html"
).read_bytes()
OCI_FIXTURE = json.loads((
    Path(__file__).parent / "fixtures" / "crunchy-postgres-oci-charts.json"
).read_text())
STATIC_DIR = COMPATIBILITY_DIR.parents[1] / "static" / "compatibilities"


def matrix(rows, headers=None):
    headers = headers or [
        "Crunchy Postgres for Kubernetes Series", "Kubernetes Version", "OpenShift Version"
    ]
    return "<table><tr>" + "".join(f"<th>{h}</th>" for h in headers) + "</tr>" + "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>"
        for row in rows
    ) + "</table>"


def response(payload, status=200):
    result = requests.Response()
    result.status_code = status
    result.url = scraper.REGISTRY_URL
    result._content = json.dumps(payload).encode()
    return result


def registry_response(url, **kwargs):
    if url == scraper.AUTH_URL:
        return response({"token": "anonymous-fixture-token"})
    if url == f"{scraper.REGISTRY_URL}/tags/list":
        return response(OCI_FIXTURE["tags"])
    for version, chart in OCI_FIXTURE["charts"].items():
        if url == f"{scraper.REGISTRY_URL}/manifests/{version}":
            return response(chart["manifest"])
        if url == f'{scraper.REGISTRY_URL}/blobs/{chart["manifest"]["config"]["digest"]}':
            return response(chart["config"])
    raise AssertionError(f"Unexpected registry request: {url}")


class CrunchyPostgresOperatorTests(unittest.TestCase):
    def test_published_matrix_including_extended_support(self):
        rows = scraper.parse_page(FIXTURE)
        expected_ranges = {
            "6.0.0": (32, 36), "5.8.0": (30, 36), "5.7.0": (28, 34),
            "5.6.0": (27, 32), "5.5.0": (25, 30), "5.4.0": (24, 29),
            "5.3.0": (22, 26), "5.2.0": (21, 24), "5.1.0": (20, 24),
            "5.0.0": (20, 24), "4.7.0": (17, 26), "4.6.0": (17, 21),
        }
        self.assertEqual([r["version"] for r in rows], list(expected_ranges))
        for row in rows:
            first, last = expected_ranges[row["version"]]
            self.assertEqual(row["kube"], [f"1.{v}" for v in range(last, first - 1, -1)])
            self.assertNotIn("chart_version", row)
            self.assertEqual(row["requirements"], [])
            self.assertEqual(row["incompatibilities"], [])

    def test_bounded_range_formats_and_deduplication(self):
        for text in ("1.30–32", "1.30 - 1.32", "v1.30 — v1.32", "1.30, 1.31–32, 1.32"):
            with self.subTest(text=text):
                self.assertEqual(scraper.parse_kube_versions(text), ["1.32", "1.31", "1.30"])
        self.assertEqual(scraper.parse_kube_versions("1.30–30"), ["1.30"])
        self.assertEqual(scraper.parse_kube_versions("  v1.30  "), ["1.30"])

    def test_rejects_unbounded_reversed_cross_major_and_malformed_ranges(self):
        for text in ("1.30+", ">=1.30", "1.30 and newer", "1.32–30", "1.30–2.1", "", "TBD", "1.30,"):
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    scraper.parse_kube_versions(text)

    def test_selects_named_columns_without_importing_openshift_versions(self):
        unrelated = matrix([["6.0.x", "4.16–22"]], ["Postgres version", "OpenShift Version"])
        content = unrelated + matrix(
            [["4.16–22", "1.32–33<sup>1</sup>", "6.0.x"]],
            ["OpenShift Version", "Kubernetes Version", "Crunchy Postgres for Kubernetes Series"],
        )
        rows = scraper.parse_page(content)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kube"], ["1.33", "1.32"])

    def test_legacy_header_and_numeric_version_sort(self):
        content = matrix(
            [["5.9.x", "1.30"], ["v5.10.X", "1.31"]],
            ["PGO Series", "Kubernetes Versions"],
        )
        self.assertEqual([r["version"] for r in scraper.parse_page(content)], ["5.10.0", "5.9.0"])

    def test_skips_empty_matching_table_before_populated_matrix(self):
        self.assertEqual(
            scraper.parse_page(matrix([]) + FIXTURE.decode()),
            scraper.parse_page(FIXTURE),
        )

    def test_identical_duplicate_rows_are_deduplicated(self):
        rows = scraper.parse_page(matrix([["6.0.x", "1.32–33"]] * 2))
        self.assertEqual(len(rows), 1)

    def test_conflicting_or_incomplete_rows_fail_instead_of_partially_updating(self):
        for content in (
            matrix([["6.0.x", "1.32–33"], ["6.0.x", "1.32–34"]]),
            matrix([["6.0.x", "1.32–33"], ["5.8.x"]]),
            matrix([["6.0.x", "1.32–33"], ["5.8.x", "1.30+"]]),
            matrix([["6.0.0-rc.1", "1.32–33"]]),
        ):
            with self.subTest(content=content):
                with self.assertRaises(ValueError):
                    scraper.parse_page(content)
                with patch.object(scraper, "fetch_page", return_value=content), \
                        patch.object(scraper, "update_compatibility_info") as update, \
                        patch.object(scraper, "print_error"):
                    scraper.scrape()
                    update.assert_not_called()

    def test_missing_table_and_fetch_failure_preserve_existing_file(self):
        for content in (None, b"<html>upstream unavailable</html>", matrix([])):
            with self.subTest(content=content):
                with patch.object(scraper, "fetch_page", return_value=content), \
                        patch.object(scraper, "update_compatibility_info") as update, \
                        patch.object(scraper, "print_error"):
                    scraper.scrape()
                    update.assert_not_called()

    def test_scrape_writes_official_matrix(self):
        with patch.object(scraper, "fetch_page", return_value=FIXTURE) as fetch, \
                patch.object(scraper.requests, "Session") as session, \
                patch.object(scraper, "update_compatibility_info") as update:
            session.return_value.__enter__.return_value.get.side_effect = registry_response
            scraper.scrape()
        fetch.assert_called_once_with(scraper.COMPATIBILITY_URL)
        expected = scraper.parse_page(FIXTURE)
        for row in expected:
            if row["version"] in OCI_FIXTURE["charts"]:
                row["chart_version"] = row["version"]
        update.assert_called_once_with(scraper.TARGET_FILE, expected)

    def test_verifies_published_chart_metadata_and_preserves_unpublished_series(self):
        versions = [row["version"] for row in scraper.parse_page(FIXTURE)]
        with patch.object(scraper.requests, "Session") as session:
            client = session.return_value.__enter__.return_value
            client.get.side_effect = registry_response
            charts = scraper.fetch_chart_versions(versions)
        self.assertEqual(charts, {version: version for version in OCI_FIXTURE["charts"]})
        # Only the exact boundary tag is requested; no later patch is substituted.
        manifest_urls = [call.args[0] for call in client.get.call_args_list
                         if "/manifests/" in call.args[0]]
        self.assertEqual(manifest_urls, [f"{scraper.REGISTRY_URL}/manifests/{v}"
                                       for v in OCI_FIXTURE["charts"]])

    def test_follows_tag_pagination_without_following_foreign_or_repeated_urls(self):
        tags_url = f"{scraper.REGISTRY_URL}/tags/list"
        next_url = f"{tags_url}?last=5.8.9"
        first_page = response({"name": "crunchydata/pgo", "tags": ["5.8.0"]})
        first_page.headers["Link"] = f'<{next_url}>; rel="next"'
        with patch.object(scraper.requests, "Session") as session:
            client = session.return_value.__enter__.return_value
            client.get.side_effect = lambda url, **kwargs: (
                first_page if url == tags_url else
                response({"name": "crunchydata/pgo", "tags": ["6.0.0"]}) if url == next_url
                else registry_response(url, **kwargs)
            )
            self.assertEqual(scraper.fetch_chart_versions(["6.0.0", "5.8.0"]),
                             {"6.0.0": "6.0.0", "5.8.0": "5.8.0"})
        for invalid_next in (tags_url, "https://example.com/tags/list"):
            with self.subTest(next_url=invalid_next), patch.object(scraper.requests, "Session") as session:
                first_page.headers["Link"] = f'<{invalid_next}>; rel="next"'
                client = session.return_value.__enter__.return_value
                client.get.side_effect = lambda url, **kwargs: (
                    first_page if url == tags_url else registry_response(url, **kwargs)
                )
                with self.assertRaises(ValueError):
                    scraper.fetch_chart_versions(["6.0.0"])
                self.assertEqual(len(client.get.call_args_list), 2)

    def test_rejects_chart_identity_and_manifest_mismatches(self):
        chart = OCI_FIXTURE["charts"]["6.0.0"]
        manifest_url = f"{scraper.REGISTRY_URL}/manifests/6.0.0"
        config_url = f'{scraper.REGISTRY_URL}/blobs/{chart["manifest"]["config"]["digest"]}'
        cases = []
        for key, value in (("name", "other"), ("version", "6.0.3"), ("appVersion", "6.0.3")):
            config = dict(chart["config"], **{key: value})
            cases.append((config_url, config))
        for key, value in (("mediaType", "application/json"), ("digest", "sha256:invalid")):
            manifest = deepcopy(chart["manifest"])
            manifest["config"][key] = value
            cases.append((manifest_url, manifest))
        cases.append((scraper.AUTH_URL, {}))
        for url, payload in cases:
            with self.subTest(url=url, payload=payload), \
                    patch.object(scraper.requests, "Session") as session:
                session.return_value.__enter__.return_value.get.side_effect = (
                    lambda requested, **kwargs: response(payload) if requested == url
                    else registry_response(requested, **kwargs)
                )
                with self.assertRaises(ValueError):
                    scraper.fetch_chart_versions(["6.0.0"])

    def test_registry_failure_after_verified_chart_never_partially_updates(self):
        failed_url = f"{scraper.REGISTRY_URL}/manifests/5.8.0"
        for failure in (
            requests.Timeout("registry timeout"),
            response({"errors": [{"code": "UNAVAILABLE"}]}, 503),
            response({"errors": [{"code": "NAME_UNKNOWN"}]}, 404),
            response({"errors": [{"code": "MANIFEST_UNKNOWN"}]}, 404),
            response({"config": {}}),
            response({"config": None}),
            response([]),
        ):
            with self.subTest(failure=failure), \
                    patch.object(scraper, "fetch_page", return_value=FIXTURE), \
                    patch.object(scraper.requests, "Session") as session, \
                    patch.object(scraper, "update_compatibility_info") as update, \
                    patch.object(scraper, "print_error") as error:
                def get(url, **kwargs):
                    if url == failed_url:
                        if isinstance(failure, Exception):
                            raise failure
                        return failure
                    return registry_response(url, **kwargs)
                session.return_value.__enter__.return_value.get.side_effect = get
                scraper.scrape()
                update.assert_not_called()
                error.assert_called_once()

    def test_no_published_charts_preserves_existing_file(self):
        with patch.object(scraper, "fetch_page", return_value=matrix([["5.2.x", "1.21–24"]])), \
                patch.object(scraper.requests, "Session") as session, \
                patch.object(scraper, "update_compatibility_info") as update, \
                patch.object(scraper, "print_error") as error:
            session.return_value.__enter__.return_value.get.side_effect = registry_response
            scraper.scrape()
            update.assert_not_called()
            error.assert_called_once()

    def test_generated_static_file_matches_source_and_schema(self):
        data = yaml.safe_load((STATIC_DIR / "crunchy-postgres-operator.yaml").read_text())
        schema = json.loads((STATIC_DIR / "schema.json").read_text())
        jsonschema.validate(data, schema)
        expected = scraper.parse_page(FIXTURE)
        self.assertEqual(len(data["versions"]), len(expected))
        for actual, source in zip(data["versions"], expected):
            self.assertEqual({key: actual[key] for key in source}, dict(source))
            chart = OCI_FIXTURE["charts"].get(actual["version"])
            if chart:
                self.assertEqual(actual["chart_version"], chart["config"]["version"])
                self.assertEqual(actual["version"], chart["config"]["appVersion"])
            else:
                self.assertNotIn("chart_version", actual)
        self.assertEqual(data["helm_repository_url"], "oci://registry.developers.crunchydata.com/crunchydata/pgo")
        self.assertEqual(data["chart_name"], "pgo")


if __name__ == "__main__":
    unittest.main()
