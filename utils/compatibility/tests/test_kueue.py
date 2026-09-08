import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import requests
import yaml

from scrapers import kueue


FIXTURES = Path(__file__).parent / "fixtures" / "kueue"


def readme(version):
    return (FIXTURES / f"v{version}-README.md").read_text()


class ChartVersionTests(unittest.TestCase):
    def test_stable_tags_are_deduplicated_and_sorted_numerically(self):
        self.assertEqual(
            kueue.stable_chart_versions({"tags": [
                "0.19.3", "0.9.5", "0.13.9", "0.13.10", "0.13.10",
                "0.20.0-rc.1", "0.19.3+build.1", "sha256-abc.sig",
                "sha256-abc.att", "v0.19.3", "latest", "00.19.3",
            ]}),
            ["0.19.3", "0.13.10", "0.13.9", "0.9.5"],
        )

    def test_missing_or_invalid_registry_tags_fail_closed(self):
        for payload in (None, [], {}, {"tags": None}, {"tags": "0.19.3"},
                        {"tags": [None]}, {"tags": []}, {"tags": ["latest"]}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                kueue.stable_chart_versions(payload)


class TestedKubernetesVersionTests(unittest.TestCase):
    def test_original_e2e_format_from_oldest_published_chart(self):
        self.assertEqual(kueue.tested_kube_versions(readme("0.9.5")),
                         ["1.31", "1.30", "1.29", "1.28"])

    def test_baseline_format_ignores_shard_links(self):
        self.assertEqual(kueue.tested_kube_versions(readme("0.19.3")),
                         ["1.36", "1.35", "1.34"])

    def test_does_not_expand_installation_minimum_or_include_other_sections(self):
        markdown = readme("0.19.3") + """
## Installation
**Requires Kubernetes 1.29 or newer**.
[1.37](https://testgrid.k8s.io/sig-scheduling#periodic-kueue-test-e2e-main-1-37)
"""
        self.assertEqual(kueue.tested_kube_versions(markdown),
                         ["1.36", "1.35", "1.34"])

    def test_gaps_are_preserved_and_duplicate_links_are_deduplicated(self):
        markdown = """## Production Readiness status
[1.28](https://testgrid.k8s.io/sig-scheduling#periodic-kueue-test-e2e-main-1-28)
[1.31](https://testgrid.k8s.io/sig-scheduling#periodic-kueue-test-e2e-main-1-31)
[1.31](https://testgrid.k8s.io/sig-scheduling#periodic-kueue-test-e2e-main-1-31)
[1.99](https://testgrid.k8s.io/sig-scheduling#periodic-kueue-test-unit-main-1-99)
[1.42](https://example.com/sig-scheduling#periodic-kueue-test-e2e-main-1-42)
"""
        self.assertEqual(kueue.tested_kube_versions(markdown), ["1.31", "1.28"])

    def test_changed_document_format_fails_closed(self):
        for markdown in ("", "Requires Kubernetes 1.29 or newer",
                         "## Production Readiness status\nNo version matrix."):
            with self.subTest(markdown=markdown), self.assertRaises(ValueError):
                kueue.tested_kube_versions(markdown)

    def test_mismatched_version_label_fails_instead_of_writing_partial_data(self):
        markdown = readme("0.19.3").replace("[1.36]", "[1.37]")
        with self.assertRaises(ValueError):
            kueue.tested_kube_versions(markdown)


class ScrapeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.output = Path(self.directory.name) / "kueue.yaml"
        self.original = (
            "icon: https://example.com/logo.svg\n"
            "helm_repository_url: oci://registry.k8s.io/kueue/charts/kueue\n"
            "chart_name: kueue\nversions: []\n"
        )
        self.output.write_text(self.original)
        self.addCleanup(patch.stopall)
        patch.object(kueue, "COMPATIBILITY_FILE", str(self.output)).start()
        patch.dict(os.environ, {"OPENAI_API_KEY": "", "EXA_API_KEY": ""}).start()
        self.sources = {
            kueue.CHART_TAGS_URL: json.dumps({"tags": ["0.9.5", "0.19.3"]}),
            kueue.README_URL.format(version="0.9.5"): readme("0.9.5"),
            kueue.README_URL.format(version="0.19.3"): readme("0.19.3"),
        }
        patch("scrapers.kueue.requests.get", side_effect=self.response).start()

    def response(self, url, *, timeout):
        self.assertGreater(timeout, 0)
        body = self.sources[url]
        if isinstance(body, Exception):
            raise body
        response = requests.Response()
        response.url = url
        response.status_code = 200 if body is not None else 404
        response._content = (body or "Not Found").encode()
        return response

    def test_scrape_writes_real_yaml_with_metadata_and_chart_images(self):
        # Only external HTTP and Helm are replaced; the shared reducer/writer run.
        manifest = """apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: manager
        image: registry.k8s.io/kueue/kueue:v0.19.3
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
spec:
  versions:
  - schema:
      openAPIV3Schema:
        properties:
          image:
            type: string
            description: Container image name
"""
        helm = subprocess.CompletedProcess(args=[], returncode=0, stdout=manifest, stderr="")
        with patch("utils.subprocess.run", return_value=helm):
            kueue.scrape()
            first_output = self.output.read_text()
            kueue.scrape()
        self.assertEqual(self.output.read_text(), first_output)
        data = yaml.safe_load(first_output)
        self.assertEqual(data["icon"], "https://example.com/logo.svg")
        self.assertEqual([row["version"] for row in data["versions"]], ["0.19.3", "0.9.5"])
        self.assertEqual(data["versions"][0]["kube"], ["1.36", "1.35", "1.34"])
        self.assertEqual(data["versions"][1]["kube"], ["1.31", "1.30", "1.29", "1.28"])
        self.assertEqual(data["versions"][0]["chart_version"], "0.19.3")
        self.assertEqual(data["versions"][0]["images"],
                         ["registry.k8s.io/kueue/kueue:v0.19.3"])

    def test_unavailable_tagged_readme_preserves_existing_file(self):
        self.sources[kueue.README_URL.format(version="0.9.5")] = None
        with self.assertRaises(requests.HTTPError):
            kueue.scrape()
        self.assertEqual(self.output.read_text(), self.original)

    def test_missing_test_versions_preserves_existing_file(self):
        self.sources[kueue.README_URL.format(version="0.9.5")] = "Requires Kubernetes 1.25+"
        with self.assertRaises(ValueError):
            kueue.scrape()
        self.assertEqual(self.output.read_text(), self.original)

    def test_registry_timeout_preserves_existing_file(self):
        self.sources[kueue.CHART_TAGS_URL] = requests.Timeout("Timed out")
        with self.assertRaises(requests.Timeout):
            kueue.scrape()
        self.assertEqual(self.output.read_text(), self.original)


if __name__ == "__main__":
    unittest.main()
