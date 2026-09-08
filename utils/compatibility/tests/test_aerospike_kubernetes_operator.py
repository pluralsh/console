"""Offline source and safety tests for the Aerospike Kubernetes Operator scraper."""

import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

import yaml


COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
import utils as compatibility_utils

SCRAPER_PATH = COMPATIBILITY / "scrapers/aerospike-kubernetes-operator.py"
spec = importlib.util.spec_from_file_location("aerospike_kubernetes_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

FIXTURES = Path(__file__).parent / "fixtures/aerospike"
REQUIREMENTS = (FIXTURES / "requirements.html").read_bytes()
INDEX = (FIXTURES / "index.yaml").read_bytes()
HELM_INSTALL = (FIXTURES / "helm-install.html").read_bytes()


class AerospikeKubernetesOperatorTests(unittest.TestCase):
    def test_requirements_are_bound_to_the_supported_kubernetes_heading(self):
        self.assertEqual(
            scraper.parse_supported_kubernetes_versions(REQUIREMENTS),
            [f"1.{minor}" for minor in range(35, 22, -1)],
        )

    def test_missing_or_ambiguous_requirements_fail_closed(self):
        sources = [
            b"<html><p>Kubernetes 1.23 to 1.35.</p></html>",
            b"<h2>Supported Kubernetes versions</h2><p>1.23</p>",
            b"<h2>Supported Kubernetes versions</h2><p>1.23 to 1.35</p>"
            b"<h2>Supported Kubernetes versions</h2><p>1.24 to 1.35</p>",
            b"<h2>Supported Kubernetes versions</h2><p>1.23 or later</p>",
            b"<h2>Supported Kubernetes versions</h2><p>Kubernetes 1.23 to 1.35 except 1.27.</p>",
            b"<h2>Supported Kubernetes versions</h2><p>Kubernetes 1.23 to 1.35-rc.1.</p>",
        ]
        for source in sources:
            with self.subTest(source=source), self.assertRaises(ValueError):
                scraper.parse_supported_kubernetes_versions(source)

    def test_requirements_range_has_a_reasonable_expansion_bound(self):
        source = (
            b"<h2>Supported Kubernetes versions</h2>"
            b"<p>Kubernetes 1.23 to 1.101.</p>"
        )
        with self.assertRaisesRegex(ValueError, "parser bound"):
            scraper.parse_supported_kubernetes_versions(source)

    def test_chart_index_maps_app_version_to_chart_version_and_ignores_unstable(self):
        self.assertEqual(
            scraper.parse_chart_versions(INDEX),
            {"4.5.0": "4.5.0", "4.4.1": "4.4.1"},
        )

    def test_chart_version_and_app_version_are_not_conflated(self):
        index = yaml.safe_dump({
            "entries": {
                "aerospike-kubernetes-operator": [
                    {"appVersion": "4.5.0", "version": "7.0.0"},
                ],
            },
        }).encode()
        self.assertEqual(scraper.parse_chart_versions(index), {"4.5.0": "7.0.0"})

    def test_chart_and_app_versions_require_three_part_stable_versions(self):
        for field in ("version", "appVersion"):
            for value in ("4.5", "4.5.0.post1", "4.5.0+build"):
                with self.subTest(field=field, value=value):
                    entry = {"appVersion": "4.5.0", "version": "4.5.0"}
                    entry[field] = value
                    index = yaml.safe_dump({
                        "entries": {"aerospike-kubernetes-operator": [entry]},
                    }).encode()
                    with self.assertRaises(ValueError):
                        scraper.parse_chart_versions(index)

    def test_chart_index_rejects_conflicting_app_versions_for_one_chart(self):
        index = yaml.safe_dump({
            "entries": {
                "aerospike-kubernetes-operator": [
                    {"appVersion": "4.5.0", "version": "4.5.0"},
                    {"appVersion": "4.4.1", "version": "4.5.0"},
                ],
            },
        }).encode()
        with self.assertRaisesRegex(ValueError, "Conflicting appVersion"):
            scraper.parse_chart_versions(index)

    def test_missing_malformed_or_wrong_chart_entries_fail_closed(self):
        sources = [
            b"",
            b"null",
            b"entries: {}",
            b"entries: []",
            yaml.safe_dump({"entries": {"other-chart": [{"version": "4.5.0"}]}}).encode(),
            yaml.safe_dump({"entries": {"aerospike-kubernetes-operator": [None]}}).encode(),
            yaml.safe_dump({"entries": {"aerospike-kubernetes-operator": [{"version": "latest"}]}}).encode(),
        ]
        for source in sources:
            with self.subTest(source=source), self.assertRaises(ValueError):
                scraper.parse_chart_versions(source)

    def test_install_page_provides_the_current_stable_operator_anchor(self):
        self.assertEqual(scraper.parse_helm_install_version(HELM_INSTALL), "4.5.0")

    def test_install_page_rejects_prerelease_and_unrelated_version_flags(self):
        prerelease = HELM_INSTALL.replace(b"4.5.0", b"4.5.0-rc.1")
        unrelated = (
            b"<main><pre><code>helm dependency update --version=9.9.9</code></pre>"
            b"</main>"
        )
        for source in (prerelease, unrelated):
            with self.subTest(source=source), self.assertRaises(ValueError):
                scraper.parse_helm_install_version(source)

    def test_fetch_page_uses_timeout_and_propagates_http_errors(self):
        response = Mock(content=b"source")
        with patch.object(scraper.requests, "get", return_value=response) as get:
            self.assertEqual(scraper.fetch_page("https://example.test/source"), b"source")
        get.assert_called_once_with("https://example.test/source", timeout=30)
        response.raise_for_status.assert_called_once_with()

        response.raise_for_status.side_effect = scraper.requests.HTTPError("boom")
        with patch.object(scraper.requests, "get", return_value=response):
            with self.assertRaises(scraper.requests.HTTPError):
                scraper.fetch_page("https://example.test/source")

    def test_requirements_with_patch_versions_do_not_silently_truncate_to_minors(self):
        source = (
            b"<h2>Supported Kubernetes versions</h2>"
            b"<p>Kubernetes 1.23 to 1.35.2.</p>"
        )
        with self.assertRaises(ValueError):
            scraper.parse_supported_kubernetes_versions(source)

    def test_build_rows_uses_current_supported_range_and_chart_mapping(self):
        rows = scraper.build_rows(REQUIREMENTS, INDEX, HELM_INSTALL)
        self.assertEqual([row["version"] for row in rows], ["4.5.0"])
        self.assertEqual([row["chart_version"] for row in rows], ["4.5.0"])
        self.assertEqual(rows[0]["kube"], [f"1.{minor}" for minor in range(35, 22, -1)])
        # The install docs require cert-manager but publish no cert-manager version.
        self.assertEqual(rows[0]["requirements"], [])

    def test_build_rows_maps_documented_chart_to_a_distinct_operator_app_version(self):
        index = yaml.safe_dump({
            "entries": {
                "aerospike-kubernetes-operator": [
                    {"appVersion": "4.5.0", "version": "7.0.0"},
                ],
            },
        }).encode()
        helm_install = HELM_INSTALL.replace(b"--version=4.5.0", b"--version=7.0.0")
        rows = scraper.build_rows(REQUIREMENTS, index, helm_install)
        self.assertEqual(rows[0]["version"], "4.5.0")
        self.assertEqual(rows[0]["chart_version"], "7.0.0")

    def test_build_rows_rejects_a_newer_chart_than_the_documented_install_anchor(self):
        index = yaml.safe_dump({
            "entries": {
                "aerospike-kubernetes-operator": [
                    {"appVersion": "4.6.0", "version": "4.6.0"},
                    {"appVersion": "4.5.0", "version": "4.5.0"},
                ],
            },
        }).encode()
        with self.assertRaisesRegex(ValueError, "disagree"):
            scraper.build_rows(REQUIREMENTS, index, HELM_INSTALL)

    def test_scrape_wires_all_official_sources_and_uses_the_expected_path(self):
        sources = {
            scraper.compatibility_url: REQUIREMENTS,
            scraper.chart_index_url: INDEX,
            scraper.helm_install_url: HELM_INSTALL,
        }
        fetch = Mock(side_effect=lambda url: sources[url])
        with patch.object(scraper, "fetch_page", fetch), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()

        update.assert_called_once()
        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/aerospike-kubernetes-operator.yaml")
        self.assertEqual(rows[0]["version"], "4.5.0")
        self.assertEqual(fetch.call_args_list[2].args[0], scraper.helm_install_url)

    def test_scrape_preserves_seeded_historical_rows_with_the_real_updater(self):
        seeded = {
            "name": scraper.app_name,
            "icon": "https://example.test/aerospike.png",
            "git_url": "https://github.com/aerospike/aerospike-kubernetes-operator",
            "release_url": "https://github.com/aerospike/aerospike-kubernetes-operator/releases",
            "readme_url": scraper.helm_install_url,
            "helm_repository_url": "https://charts.example.test/aerospike",
            "chart_name": scraper.chart_name,
            "versions": [
                {
                    "version": "3.0.0",
                    "kube": ["1.27", "1.26", "1.25", "1.24", "1.23", "1.22", "1.21", "1.20", "1.19"],
                    "chart_version": "3.0.0",
                    "images": ["aerospike/operator:3.0.0"],
                    "requirements": [],
                    "incompatibilities": [],
                },
            ],
        }
        sources = {
            scraper.compatibility_url: REQUIREMENTS,
            scraper.chart_index_url: INDEX,
            scraper.helm_install_url: HELM_INSTALL,
        }

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / f"{scraper.app_name}.yaml"
            output.write_text(yaml.safe_dump(seeded, sort_keys=False), encoding="utf-8")

            def chart_images(_url, _chart, version, _values=None):
                return [f"aerospike/operator:{version}"]

            with patch.object(scraper, "compatibility_file", output.as_posix()), \
                    patch.object(scraper, "fetch_page", side_effect=lambda url: sources[url]), \
                    patch.object(compatibility_utils, "get_chart_images", side_effect=chart_images), \
                    patch.object(compatibility_utils, "summarization_enabled", return_value=False), \
                    patch.object(compatibility_utils, "print_warning"), \
                    patch.object(compatibility_utils, "print_success"):
                scraper.scrape()

            result = yaml.safe_load(output.read_text(encoding="utf-8"))

        self.assertEqual(
            {version["version"] for version in result["versions"]},
            {"3.0.0", "4.5.0"},
        )
        historical = next(row for row in result["versions"] if row["version"] == "3.0.0")
        self.assertEqual(
            historical["kube"],
            ["1.27", "1.26", "1.25", "1.24", "1.23", "1.22", "1.21", "1.20", "1.19"],
        )
        self.assertEqual(historical["chart_version"], "3.0.0")
        current = next(row for row in result["versions"] if row["version"] == "4.5.0")
        self.assertEqual(current["kube"], [f"1.{minor}" for minor in range(35, 22, -1)])
        self.assertEqual(current["images"], ["aerospike/operator:4.5.0"])
        self.assertEqual(result["icon"], seeded["icon"])
        self.assertEqual(result["helm_repository_url"], seeded["helm_repository_url"])

    def test_source_failure_never_overwrites_existing_compatibility(self):
        for source in (None, b"<html>changed</html>", b"<h2>Supported Kubernetes versions</h2><p>1.23 or later</p>"):
            with self.subTest(source=source), \
                    patch.object(scraper, "fetch_page", return_value=source), \
                    patch.object(scraper, "update_compatibility_info") as update:
                with self.assertRaises(ValueError):
                    scraper.scrape()
                update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
