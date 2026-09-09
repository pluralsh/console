"""Offline regressions for release-specific Longhorn Kubernetes evidence."""

from copy import deepcopy
import importlib
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

import requests
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.longhorn")
FIXTURES = Path(__file__).parent / "fixtures"
TESTED = {
    "1.11.0": ["1.35", "1.34", "1.33", "1.32"],
    "1.11.1": ["1.35", "1.34", "1.33", "1.32"],
    "1.11.2": ["1.35", "1.34", "1.33", "1.32"],
    "1.11.3": ["1.36", "1.35", "1.34"],
    "1.12.0": ["1.36", "1.35", "1.34", "1.33"],
    "1.12.1": ["1.36", "1.35", "1.34", "1.33"],
}


def fixture(version):
    return (FIXTURES / f"longhorn-v{version}-kubernetes.html").read_bytes()


def section(version="1.12.1", releases=("1.36", "1.35", "1.34", "1.33")):
    rows = "".join(
        f"<tr><td>{release}</td><td>22 Apr 2026</td><td>28 Jun 2027</td></tr>"
        for release in releases
    )
    return (
        '<h3 id="kubernetes-version">Kubernetes Version</h3>'
        f"<p>Please ensure Kubernetes is at least v1.21 before upgrading to Longhorn v{version}.</p>"
        "<p>We recommend running your Kubernetes cluster on one of the following versions. "
        f"These versions have been tested with Longhorn v{version}.</p>"
        "<table><thead><tr><th>Release</th><th>Released</th><th>End-of-life</th></tr></thead>"
        f"<tbody>{rows}</tbody></table>"
    )


def entry(version, chart=None, kube=">=1.25.0-0"):
    return {"appVersion": version, "version": chart or version, "kubeVersion": kube}


def index(entries):
    return {"entries": {"longhorn": entries}}


class TestedVersionParserTests(unittest.TestCase):
    def test_official_release_fixtures_including_patch_specific_change(self):
        for version, expected in TESTED.items():
            with self.subTest(version=version):
                self.assertEqual(scraper.parse_tested_kube_versions(fixture(version), version), expected)

    def test_only_target_section_and_release_column_supply_versions(self):
        unrelated = '<h3 id="operating-system">Operating System</h3><table><tr><td>1.99</td></tr></table>'
        content = unrelated + section(releases=("1.9", "1.35", "1.10")) + unrelated
        self.assertEqual(scraper.parse_tested_kube_versions(content, "1.12.1"), ["1.35", "1.10", "1.9"])

    def test_wrong_release_missing_table_and_invalid_cells_are_rejected(self):
        valid = section()
        invalid_sources = [
            "<p>No Kubernetes table</p>",
            valid.replace('id="kubernetes-version"', 'id="operating-system"'),
            section(version="1.12.0"),
            section(releases=()),
            section(releases=("1.36 or later",)),
            section(releases=("1.36-rc.1",)),
            section(releases=("1.36.0",)),
            section(releases=("not-a-version",)),
            valid.replace("<th>Release</th>", "<th>Operating system</th>"),
            valid.replace("<table>", '<h3 id="coredns-setup">CoreDNS Setup</h3><table>', 1),
        ]
        for content in invalid_sources:
            with self.subTest(content=content), self.assertRaises(ValueError):
                scraper.parse_tested_kube_versions(content, "1.12.1")


class TestedVersionFetchTests(unittest.TestCase):
    def test_fetch_validates_http_and_uses_bounded_timeout(self):
        url = "https://longhorn.io/docs/1.12.1/best-practices/"
        response = Mock(url=url, content=section().encode(), text=section(), status_code=200)
        with patch.object(scraper.requests, "get", return_value=response) as get:
            self.assertEqual(scraper.fetch_tested_kube_versions("1.12.1"), TESTED["1.12.1"])
        self.assertEqual(get.call_args.args[0], url)
        self.assertEqual(get.call_args.kwargs["timeout"], 30)
        response.raise_for_status.assert_called_once_with()

    def test_redirect_to_latest_or_different_release_is_rejected(self):
        for destination in ["https://longhorn.io/docs/latest/best-practices/",
                            "https://longhorn.io/docs/1.12.0/best-practices/"]:
            response = Mock(url=destination, content=section().encode(), text=section(), status_code=200)
            with self.subTest(destination=destination), patch.object(scraper.requests, "get", return_value=response), \
                    self.assertRaises(ValueError):
                scraper.fetch_tested_kube_versions("1.12.1")

    def test_http_error_and_timeout_propagate(self):
        response = Mock()
        response.raise_for_status.side_effect = requests.HTTPError("404")
        with patch.object(scraper.requests, "get", return_value=response), self.assertRaises(requests.HTTPError):
            scraper.fetch_tested_kube_versions("1.12.1")
        with patch.object(scraper.requests, "get", side_effect=requests.Timeout("timeout")), \
                self.assertRaises(requests.Timeout):
            scraper.fetch_tested_kube_versions("1.12.1")


class ChartSelectionTests(unittest.TestCase):
    def test_new_releases_never_expand_installation_minimum_or_current_kubernetes(self):
        data = index([entry("1.12.1", kube=">=1.25.0-0")])
        with patch.object(scraper, "fetch_tested_kube_versions", return_value=TESTED["1.12.1"]):
            for latest in ["1.35", "1.37", "1.99"]:
                with self.subTest(latest=latest):
                    rows = scraper.extract_versions(data, latest)
                    self.assertEqual(rows[0]["kube"], TESTED["1.12.1"])
                    self.assertNotIn("1.25", rows[0]["kube"])
                    self.assertNotIn("1.37", rows[0]["kube"])

    def test_distinct_patch_releases_keep_their_own_tested_matrix(self):
        with patch.object(scraper, "fetch_tested_kube_versions", side_effect=lambda version: TESTED[version]):
            rows = scraper.extract_versions(index([entry("1.11.2"), entry("1.11.3")]), "1.37")
        self.assertEqual({row["version"]: row["kube"] for row in rows},
                         {version: TESTED[version] for version in ["1.11.2", "1.11.3"]})

    def test_highest_stable_chart_wins_and_prereleases_do_not_fetch_docs(self):
        data = index([
            entry("v1.12.1", "1.12.1"), entry("1.12.1", "1.12.2"),
            entry("1.12.1", "1.13.0-rc.1"), entry("1.13.0-rc.1", "1.13.0"),
            entry("1.13.0-dev-20260909", "1.13.0-dev-20260909"),
        ])
        before = deepcopy(data)
        with patch.object(scraper, "fetch_tested_kube_versions", return_value=TESTED["1.12.1"]) as fetch:
            rows = scraper.extract_versions(data, "1.37")
        self.assertEqual([(row["version"], row["chart_version"]) for row in rows], [("1.12.1", "1.12.2")])
        fetch.assert_called_once_with("1.12.1")
        self.assertEqual(data, before)

    def test_legacy_releases_keep_existing_helm_range_interpretation(self):
        with patch.object(scraper, "fetch_tested_kube_versions") as fetch:
            rows = scraper.extract_versions(index([
                entry("1.10.1", kube=">=1.25.0-0"),
                entry("1.7.0", kube=">=1.21.0-0 <1.25.0-0"),
            ]), "1.36")
        fetch.assert_not_called()
        by_version = {row["version"]: row for row in rows}
        self.assertEqual(set(by_version["1.10.1"]["kube"]), {f"1.{minor}" for minor in range(25, 37)})
        self.assertEqual(set(by_version["1.7.0"]["kube"]), {f"1.{minor}" for minor in range(21, 25)})


class ScrapeAtomicityTests(unittest.TestCase):
    def test_later_document_failure_never_writes_partial_results(self):
        content = yaml.safe_dump(index([entry("1.12.1"), entry("1.11.3")])).encode()
        for error in [requests.Timeout("timeout"), requests.HTTPError("404"), ValueError("invalid table")]:
            with self.subTest(error=error), patch.object(scraper, "fetch_page", return_value=content), \
                    patch.object(scraper, "current_kube_version", return_value="1.37"), \
                    patch.object(scraper, "fetch_tested_kube_versions", side_effect=[TESTED["1.12.1"], error]), \
                    patch.object(scraper, "print_error"), patch.object(scraper, "update_compatibility_info") as write:
                try:
                    scraper.scrape()
                except (requests.RequestException, ValueError):
                    # Either the scraper or its caller may report the failure.
                    pass
                write.assert_not_called()

    def test_valid_sources_write_once_after_all_documents_validate(self):
        versions = ["1.11.2", "1.11.3", "1.12.1"]
        content = yaml.safe_dump(index([entry(version) for version in versions])).encode()
        with patch.object(scraper, "fetch_page", return_value=content), \
                patch.object(scraper, "current_kube_version", return_value="1.37"), \
                patch.object(scraper, "fetch_tested_kube_versions", side_effect=lambda version: TESTED[version]), \
                patch.object(scraper, "update_compatibility_info") as write:
            scraper.scrape()
        write.assert_called_once()
        self.assertEqual(write.call_args.args[0], "../../static/compatibilities/longhorn.yaml")
        self.assertEqual({row["version"]: row["kube"] for row in write.call_args.args[1]},
                         {version: TESTED[version] for version in versions})


if __name__ == "__main__":
    unittest.main()
