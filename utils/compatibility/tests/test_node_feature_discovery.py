import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
spec = importlib.util.spec_from_file_location(
    "node_feature_discovery",
    Path(__file__).parents[1] / "scrapers" / "node-feature-discovery.py",
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def documentation(minimum):
    return (
        "Node Feature Discovery can be deployed on any recent version of Kubernetes\n"
        f"(v{minimum}+)."
    ).encode()


class NodeFeatureDiscoveryTests(unittest.TestCase):
    def test_documented_range_and_boundaries(self):
        self.assertEqual(scraper.documented_versions(documentation("1.24"), "1.26"),
                         ["1.26", "1.25", "1.24"])
        self.assertEqual(scraper.documented_versions(documentation("1.24"), "1.24"),
                         ["1.24"])
        for minimum, current in [("1.27", "1.26"), ("2.0", "2.1"), ("1.24", "invalid")]:
            with self.subTest(minimum=minimum, current=current), self.assertRaises(ValueError):
                scraper.documented_versions(documentation(minimum), current)

    def test_undocumented_or_unrelated_version_is_not_evidence(self):
        self.assertEqual(scraper.documented_versions("Use Kubernetes v1.24+", "1.26"), [])
        with self.assertRaises(UnicodeDecodeError):
            scraper.documented_versions(b"\xff", "1.26")

    def test_tagged_patch_minimum_and_chart_pairing(self):
        charts = {"0.16.1": "0.16.1", "0.16.2": "0.16.2", "0.13.6": "0.13.6",
                  "0.11.3": "0.11.3", "0.20.0-rc.1": "0.20.0-rc.1",
                  "0.20.0": "0.20.0-rc.2"}
        docs = {scraper.deployment_url.format(version="0.16.1"): documentation("1.21"),
                scraper.deployment_url.format(version="0.16.2"): documentation("1.24"),
                scraper.deployment_url.format(version="0.13.6"): b"# Deployment"}
        with patch.object(scraper, "get_chart_versions", return_value=charts), \
             patch.object(scraper, "current_kube_version", return_value="1.26"), \
             patch.object(scraper, "fetch_page", side_effect=docs.get) as fetch, \
             patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/node-feature-discovery.yaml")
        self.assertEqual([r["version"] for r in rows], ["0.16.1", "0.16.2"])
        self.assertEqual([r["chart_version"] for r in rows], ["0.16.1", "0.16.2"])
        self.assertEqual([r["kube"][-1] for r in rows], ["1.21", "1.24"])
        self.assertEqual(fetch.call_count, 4)

    def test_source_failure_preserves_existing_file(self):
        for charts in [{}, {"0.19.0": "0.19.0"}]:
            with self.subTest(charts=charts), \
                 patch.object(scraper, "get_chart_versions", return_value=charts), \
                 patch.object(scraper, "current_kube_version", return_value="1.26"), \
                 patch.object(scraper, "fetch_page", return_value=None), \
                 patch.object(scraper, "update_compatibility_info") as update:
                with self.assertRaisesRegex(ValueError, "No documented"):
                    scraper.scrape()
                update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
