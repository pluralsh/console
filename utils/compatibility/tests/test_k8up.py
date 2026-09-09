"""Offline tests; archives are synthetic, with released chart/operator mappings.

The support-statement fixture follows the versioned upstream document:
https://github.com/k8up-io/k8up/blob/v2.16.0/docs/modules/ROOT/pages/explanations/system-requirements.adoc
The simplified archives exercise parsing and validation, not Helm rendering.
"""

import copy
import hashlib
import importlib
import io
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import requests
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
k8up = importlib.import_module("scrapers.k8up")

REQUIREMENTS = """
= System Requirements
== Supported Kubernetes Versions
K8up (v2 or later) officially only supports recent stable Kubernetes versions
with support for WebSocket connections in the API server (`1.31` or later).
Older Kubernetes versions may work by setting
`--insecure-allow-podexec-spdy-fallback=true`, but are not officially supported.
K8up v1 supports legacy OpenShift `3.11` (Kubernetes 1.11).
"""


def archive(chart="4.9.0", app="v2.15.0", **image_overrides):
    image = {"registry": "ghcr.io", "repository": "k8up-io/k8up", "tag": app}
    image.update(image_overrides)
    documents = {
        "Chart.yaml": {"name": "k8up", "version": chart},
        "values.yaml": {"image": image},
    }
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        for name, content in documents.items():
            payload = yaml.safe_dump(content).encode()
            member = tarfile.TarInfo(f"k8up/{name}")
            member.size = len(payload)
            tar.addfile(member, io.BytesIO(payload))
    return buffer.getvalue()


def fixture(releases=(("4.9.0", "v2.15.0"), ("4.10.0", "v2.16.0"))):
    entries, sources = [], {}
    for chart, app in releases:
        url = f"{k8up.REPOSITORY}/releases/download/k8up-{chart}/k8up-{chart}.tgz"
        payload = archive(chart, app)
        sources[url] = payload
        sources[f"{k8up.RAW_REPOSITORY}/{app}/{k8up.REQUIREMENTS_PATH}"] = REQUIREMENTS
        entries.append({
            "version": chart, "urls": [url],
            "digest": hashlib.sha256(payload).hexdigest(),
        })
    return {"entries": {"k8up": entries}}, sources


class K8upTests(unittest.TestCase):
    def test_chart_and_operator_versions_are_distinct(self):
        index, sources = fixture()
        rows = k8up.build_rows(yaml.safe_dump(index), "1.36", sources.__getitem__)
        self.assertEqual(
            [(r["version"], r["chart_version"]) for r in rows],
            [("2.16.0", "4.10.0"), ("2.15.0", "4.9.0")],
        )
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34", "1.33", "1.32", "1.31"])

    def test_newest_chart_for_same_operator_wins(self):
        index, sources = fixture((("4.9.0", "v2.15.0"), ("4.9.1", "v2.15.0")))
        rows = k8up.build_rows(yaml.safe_dump(index), "1.31", sources.__getitem__)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["chart_version"], "4.9.1")

    def test_older_and_prerelease_charts_are_excluded(self):
        index, _ = fixture()
        index["entries"]["k8up"] += [
            {"version": "4.8.7"}, {"version": "4.11.0-rc.1"}, {"version": "garbage"}
        ]
        self.assertEqual(
            [v for v, _, _ in k8up.chart_entries(yaml.safe_dump(index))],
            ["4.10.0", "4.9.0"],
        )

    def test_empty_or_malformed_index_is_rejected(self):
        for value in (None, [], {}, {"entries": {"k8up": []}}, {"entries": {"k8up": [None]}}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                k8up.chart_entries(yaml.safe_dump(value))

    def test_conflicting_chart_records_are_rejected(self):
        index, _ = fixture()
        duplicate = copy.deepcopy(index["entries"]["k8up"][0])
        duplicate["digest"] = "0" * 64
        index["entries"]["k8up"].append(duplicate)
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            k8up.chart_entries(yaml.safe_dump(index))

    def test_unexpected_archive_url_is_rejected(self):
        index, _ = fixture()
        index["entries"]["k8up"][0]["urls"] = ["https://example.com/chart.tgz"]
        with self.assertRaises(ValueError):
            k8up.chart_entries(yaml.safe_dump(index))

    def test_archive_digest_is_verified(self):
        with self.assertRaisesRegex(ValueError, "Digest"):
            k8up.operator_version(archive(), "4.9.0", "0" * 64)

    def test_packaged_chart_version_is_verified(self):
        data = archive()
        with self.assertRaisesRegex(ValueError, "metadata"):
            k8up.operator_version(data, "4.10.0", hashlib.sha256(data).hexdigest())

    def test_mutable_or_prerelease_image_tags_are_rejected(self):
        for tag in ("latest", "v2.17.0-rc.1", "v2.15", ""):
            data = archive(app=tag)
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                k8up.operator_version(data, "4.9.0", hashlib.sha256(data).hexdigest())

    def test_unrelated_image_is_rejected(self):
        data = archive(repository="unrelated/operator")
        with self.assertRaisesRegex(ValueError, "image repository"):
            k8up.operator_version(data, "4.9.0", hashlib.sha256(data).hexdigest())

    def test_legacy_or_vague_requirements_are_not_used(self):
        for text in (
            "K8up v1 supports Kubernetes 1.11.",
            "K8up (v2 or later) officially only supports recent stable Kubernetes versions.",
            REQUIREMENTS.replace("1.31", "1.31.1"),
        ):
            with self.subTest(text=text), self.assertRaises(ValueError):
                k8up.supported_kubernetes(text, "1.36")

    def test_ceiling_is_validated(self):
        for ceiling in ("1.30", "1.36.0", "latest", None):
            with self.subTest(ceiling=ceiling), self.assertRaises(ValueError):
                k8up.supported_kubernetes(REQUIREMENTS, ceiling)

    def test_changed_support_minimum_is_respected(self):
        self.assertEqual(
            k8up.supported_kubernetes(REQUIREMENTS.replace("1.31", "1.35"), "1.36"),
            ["1.36", "1.35"],
        )

    def test_network_failure_prevents_any_write(self):
        index, sources = fixture()
        sources[f"{k8up.HELM_REPOSITORY}/index.yaml"] = yaml.safe_dump(index)
        def fetch(url):
            if "/v2.15.0/" in url:
                raise requests.HTTPError("upstream unavailable")
            return sources[url]
        with patch.object(k8up, "fetch_source", side_effect=fetch), \
             patch("utils.current_kube_version", return_value="1.36"), \
             patch("utils.update_compatibility_info") as writer:
            with self.assertRaises(requests.HTTPError):
                k8up.scrape()
            writer.assert_not_called()

    def test_changed_document_prevents_any_write(self):
        index, sources = fixture()
        sources[f"{k8up.HELM_REPOSITORY}/index.yaml"] = yaml.safe_dump(index)
        sources[f"{k8up.RAW_REPOSITORY}/v2.16.0/{k8up.REQUIREMENTS_PATH}"] = "unknown"
        with patch.object(k8up, "fetch_source", side_effect=sources.__getitem__), \
             patch("utils.current_kube_version", return_value="1.36"), \
             patch("utils.update_compatibility_info") as writer:
            with self.assertRaises(ValueError):
                k8up.scrape()
            writer.assert_not_called()

    def test_fetch_timeout_and_http_error(self):
        with patch.object(k8up.requests, "get") as get:
            get.return_value.raise_for_status.side_effect = requests.HTTPError()
            with self.assertRaises(requests.HTTPError):
                k8up.fetch_source("https://example.com")
            get.assert_called_once_with("https://example.com", timeout=30)

    def test_shared_writer_preserves_metadata_and_is_repeatable(self):
        from utils import update_compatibility_info
        index, sources = fixture()
        rows = k8up.build_rows(yaml.safe_dump(index), "1.36", sources.__getitem__)
        with tempfile.TemporaryDirectory() as directory, \
             patch("utils.get_chart_images", return_value=["ghcr.io/k8up-io/k8up:v2.16.0"]), \
             patch("utils.summarization_enabled", return_value=False):
            path = Path(directory) / "k8up.yaml"
            path.write_text(yaml.safe_dump({
                "name": "k8up", "helm_repository_url": k8up.HELM_REPOSITORY,
                "icon": "existing-icon", "versions": [],
            }))
            update_compatibility_info(str(path), rows)
            first = path.read_text()
            result = yaml.safe_load(first)
            self.assertEqual(result["icon"], "existing-icon")
            self.assertEqual(len(result["versions"]), 2)
            update_compatibility_info(str(path), rows)
            self.assertEqual(path.read_text(), first)


if __name__ == "__main__":
    unittest.main()
