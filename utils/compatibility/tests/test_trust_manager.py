import importlib
import unittest
from unittest.mock import patch

import yaml

scraper = importlib.import_module("scrapers.trust-manager")


def chart(app="v0.24.0", version="v0.24.0", kube=">= 1.25.0-0"):
    return {"appVersion": app, "version": version, "kubeVersion": kube}


def index(*entries):
    return yaml.safe_dump({"entries": {"trust-manager": list(entries)}})


class TrustManagerTests(unittest.TestCase):
    def test_declared_minimum_is_bounded_by_current_kubernetes(self):
        rows = scraper.parse_index(index(chart()), "1.27")
        self.assertEqual(rows, [{
            "version": "0.24.0", "chart_version": "0.24.0",
            "kube": ["1.25", "1.26", "1.27"],
            "requirements": [], "incompatibilities": [],
        }])

    def test_upper_bounds_are_respected(self):
        rows = scraper.parse_index(index(chart(kube=">= 1.25.0-0 < 1.27.0")), "1.36")
        self.assertEqual(rows[0]["kube"], ["1.25", "1.26"])

    def test_unknown_future_and_prerelease_entries_are_not_reported(self):
        entries = [chart(kube=None), chart(kube=">=1.40.0"),
                   chart(app="v0.25.0-alpha.0"), chart(version="v0.25.0-rc.1")]
        self.assertEqual(scraper.parse_index(index(*entries), "1.36"), [])

    def test_latest_chart_wins_regardless_of_index_order(self):
        rows = scraper.parse_index(index(
            chart(version="v0.24.1"), chart(version="v0.24.3"),
            chart(version="v0.24.2")), "1.26")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["chart_version"], "0.24.3")

    def test_invalid_constraint_does_not_write_partial_data(self):
        with patch.object(scraper, "current_kube_version", return_value="1.36"), \
             patch.object(scraper, "fetch_page", return_value=index(
                 chart(), chart(app="v0.20.0", kube="not-a-version"))), \
             patch.object(scraper, "update_compatibility_info") as update:
            with self.assertRaises(ValueError):
                scraper.scrape()
            update.assert_not_called()

    def test_scrape_uses_existing_update_pipeline(self):
        with patch.object(scraper, "current_kube_version", return_value="1.26"), \
             patch.object(scraper, "fetch_page", return_value=index(chart())) as fetch, \
             patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
            fetch.assert_called_once_with(scraper.INDEX_URL)
            self.assertEqual(update.call_args.args[0],
                             "../../static/compatibilities/trust-manager.yaml")
            self.assertEqual(update.call_args.args[1][0]["kube"], ["1.25", "1.26"])

    def test_unavailable_or_empty_index_does_not_overwrite_data(self):
        for content in (None, index(), index(chart(kube=None))):
            with self.subTest(content=content), \
                 patch.object(scraper, "current_kube_version", return_value="1.36"), \
                 patch.object(scraper, "fetch_page", return_value=content), \
                 patch.object(scraper, "update_compatibility_info") as update:
                scraper.scrape()
                update.assert_not_called()

    def test_major_transition_preserves_existing_data(self):
        with patch.object(scraper, "current_kube_version", return_value="2.0"), \
             patch.object(scraper, "fetch_page", return_value=index(chart())), \
             patch.object(scraper, "update_compatibility_info") as update:
            with self.assertRaisesRegex(ValueError, "Kubernetes major changed"):
                scraper.scrape()
            update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
