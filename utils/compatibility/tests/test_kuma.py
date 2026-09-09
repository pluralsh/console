import unittest
from unittest.mock import Mock, patch

import requests

from scrapers import kuma


class KumaTests(unittest.TestCase):
    def test_only_explicit_test_targets_are_included(self):
        self.assertEqual(kuma.parse_kube_versions(
            "K8S_MIN_VERSION = v1.20.15-k3s1\n"
            "K8S_MAX_VERSION=v1.26.1-k3s1\n"
            "KUBEBUILDER_ASSETS_VERSION=1.25\n"
        ), ["1.26", "1.20"])

    def test_missing_or_nonconcrete_target_is_rejected(self):
        for text in ("", "K8S_MIN_VERSION=v1.30.0", "K8S_MIN_VERSION=$(VERSION)\nK8S_MAX_VERSION=v1.35.1"):
            with self.subTest(text=text), self.assertRaises(ValueError):
                kuma.parse_kube_versions(text)

    def test_equal_targets_are_deduplicated(self):
        self.assertEqual(kuma.parse_kube_versions(
            "K8S_MIN_VERSION=v1.30.1\nK8S_MAX_VERSION=v1.30.2\n"
        ), ["1.30"])

    def test_latest_stable_chart_per_documented_family(self):
        catalog = [
            {"edition": "kuma", "release": "2.14.x"},
            {"edition": "kuma", "release": "2.9.x"},
            {"edition": "kuma", "release": "2.15.x", "label": "dev"},
        ]
        charts = {"2.14.0": "2.14.0", "2.14.4": "2.14.4", "2.14.5-rc.1": "2.14.5-rc.1",
                  "2.14.6": "2.14.6-preview", "2.9.9": "2.9.9", "2.9.19": "2.9.19",
                  "2.15.0": "2.15.0", "2.1.0": "2.1.0"}
        self.assertEqual([(str(v), c) for v, c in kuma.select_releases(catalog, charts)],
                         [("2.14.4", "2.14.4"), ("2.9.19", "2.9.19")])

    def test_missing_chart_preserves_previous_table(self):
        with patch.object(kuma, "fetch_page", return_value=b"- edition: kuma\n  release: 2.14.x\n"), \
             patch.object(kuma, "get_chart_versions", return_value={}), \
             patch.object(kuma, "update_compatibility_info") as writer:
            with self.assertRaises(ValueError):
                kuma.scrape()
            writer.assert_not_called()

    @patch.object(kuma.requests, "get")
    def test_old_tag_spelling_is_used_only_on_404(self, get):
        get.side_effect = [Mock(status_code=404), Mock(status_code=200,
            text="K8S_MIN_VERSION=v1.20.1\nK8S_MAX_VERSION=v1.26.1")]
        self.assertEqual(kuma.fetch_release_targets("2.2.9"), ["1.26", "1.20"])
        self.assertIn("/v2.2.9/", get.call_args_list[0].args[0])
        self.assertIn("/2.2.9/", get.call_args_list[1].args[0])

    @patch.object(kuma.requests, "get")
    def test_server_error_does_not_try_another_tag(self, get):
        get.return_value = Mock(status_code=503)
        get.return_value.raise_for_status.side_effect = requests.HTTPError("503")
        with self.assertRaises(requests.HTTPError):
            kuma.fetch_release_targets("2.14.4")
        self.assertEqual(get.call_count, 1)

    def test_source_failure_does_not_write_partial_results(self):
        catalog = b"- edition: kuma\n  release: 2.14.x\n- edition: kuma\n  release: 2.13.x\n"
        with patch.object(kuma, "fetch_page", return_value=catalog), \
             patch.object(kuma, "get_chart_versions", return_value={"2.14.4": "2.14.4", "2.13.10": "2.13.10"}), \
             patch.object(kuma, "fetch_release_targets", side_effect=[["1.35", "1.32"], ValueError("missing target")]), \
             patch.object(kuma, "update_compatibility_info") as writer:
            with self.assertRaises(ValueError):
                kuma.scrape()
            writer.assert_not_called()


if __name__ == "__main__":
    unittest.main()
