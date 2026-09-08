import copy
import importlib
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import requests
import yaml


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.rabbitmq-cluster-operator")
import utils


class RabbitMQClusterOperatorTests(unittest.TestCase):
    def test_latest_upstream_release_is_not_limited_by_bitnami_app_version(self):
        with patch.object(scraper, "get_latest_github_release", return_value="v2.22.5") as release, \
                patch.object(scraper, "current_kube_version", return_value="1.36"), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()

        release.assert_called_once_with("rabbitmq", "cluster-operator")
        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/rabbitmq-cluster-operator.yaml")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["version"], "2.22.5")
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34", "1.33", "1.32", "1.31"])
        self.assertNotIn("chart_version", rows[0])
        self.assertNotIn("images", rows[0])
        self.assertTrue(any("cert-manager" in note for note in rows[0]["summary"]["breaking_changes"]))

    def test_minimum_supported_versions_do_not_expand_past_current_kubernetes(self):
        row = scraper.build_latest_version("v2.20.0", "1.31")
        self.assertEqual(row["kube"], ["1.31"])

    def test_http_probe_requirement_is_limited_to_operator_2_22_and_later(self):
        older = scraper.build_latest_version("v2.21.0", "1.36")
        current = scraper.build_latest_version("v2.22.5", "1.36")
        self.assertFalse(any("HTTP startup probe" in note for note in older["summary"]["breaking_changes"]))
        notes = " ".join(current["summary"]["breaking_changes"])
        self.assertIn("RabbitMQ 4.2.4+ and 4.3.0+", notes)
        self.assertIn('rabbitmq.com/legacy-startup-probe: "true"', notes)
        self.assertIn("Pause reconciliation", notes)

    def test_versions_outside_documented_policy_fail_before_writing(self):
        for release in [None, "not-a-version", "v2.19.0", "v2.23.0-rc.1", "v3.0.0"]:
            with self.subTest(release=release), \
                    patch.object(scraper, "get_latest_github_release", return_value=release), \
                    patch.object(scraper, "current_kube_version", return_value="1.36"), \
                    patch.object(scraper, "update_compatibility_info") as update:
                with self.assertRaises(ValueError):
                    scraper.scrape()
                update.assert_not_called()

    def test_missing_or_unsupported_kubernetes_version_is_rejected(self):
        for kube in [None, "", "invalid", "1.30", "1.36.0-rc.1", "2.0"]:
            with self.subTest(kube=kube), self.assertRaises(ValueError):
                scraper.build_latest_version("v2.22.5", kube)

    def test_release_fetch_failure_does_not_write(self):
        with patch.object(scraper, "get_latest_github_release", side_effect=requests.HTTPError("503")), \
                patch.object(scraper, "update_compatibility_info") as update:
            with self.assertRaises(requests.HTTPError):
                scraper.scrape()
            update.assert_not_called()

    def test_updater_keeps_historical_chart_metadata_and_is_idempotent(self):
        historical = {
            "version": "2.16.1",
            "kube": ["1.36", "1.19"],
            "requirements": [],
            "incompatibilities": [],
            "chart_version": "4.4.34",
            "images": ["docker.io/bitnami/rabbitmq-cluster-operator:2.16.1-debian-12-r0"],
            "summary": {"features": ["Existing release note."]},
        }
        original = {"helm_repository_url": "https://charts.bitnami.com/bitnami", "versions": [historical]}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rabbitmq-cluster-operator.yaml"
            path.write_text(yaml.safe_dump(original), encoding="utf-8")
            # Use existing image metadata; this test never invokes Helm or an API.
            with patch.object(utils, "get_chart_images", return_value=None), \
                    patch.object(utils, "summarization_enabled", return_value=False):
                row = scraper.build_latest_version("v2.22.5", "1.36")
                utils.update_compatibility_info(path.as_posix(), [copy.deepcopy(row)])
                first = yaml.safe_load(path.read_text(encoding="utf-8"))
                utils.update_compatibility_info(path.as_posix(), [copy.deepcopy(row)])
                second = yaml.safe_load(path.read_text(encoding="utf-8"))

        self.assertEqual(first, second)
        self.assertEqual(first["versions"], [row, historical])
        self.assertEqual(first["helm_repository_url"], original["helm_repository_url"])


if __name__ == "__main__":
    unittest.main()
