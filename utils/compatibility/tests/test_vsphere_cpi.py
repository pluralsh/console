"""Offline tests: python -m unittest discover -s tests -p 'test_vsphere_cpi.py'."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

import requests

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "vsphere_cpi_scraper", COMPATIBILITY / "scrapers/vsphere-cpi.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def index(*charts):
    return {"entries": {"vsphere-cpi": list(charts)}}


class VSphereCPITests(unittest.TestCase):
    def test_app_version_determines_kubernetes_and_newest_chart_wins(self):
        rows = scraper.extract_versions(index(
            {"appVersion": "v1.29.1", "version": "1.31.9"},
            {"appVersion": "1.29.1", "version": "1.31.10"},
            {"appVersion": "1.35.0", "version": "1.0.0"},
        ))
        self.assertEqual([row["version"] for row in rows], ["1.35.0", "1.29.1"])
        self.assertEqual(rows[1]["kube"], ["1.29"])
        self.assertEqual(rows[1]["chart_version"], "1.31.10")

    def test_prerelease_build_and_bad_versions_are_not_releases(self):
        charts = [{"appVersion": "1.35.0", "version": "1.35.0"}]
        for value in ("1.36", 1.36, None, "main", "1.36.0-rc.1", "1.36.0+build", "1.36.0 trailing"):
            charts.append({"appVersion": value, "version": "1.36.0"})
            charts.append({"appVersion": "1.36.0", "version": value})
        charts.append({"appVersion": "1.34.0", "version": "1.34.0", "deprecated": True})
        charts.append({"appVersion": "2.0.0", "version": "2.0.0"})
        self.assertEqual([row["version"] for row in scraper.extract_versions(index(*charts))], ["1.35.0"])

    def test_missing_or_changed_index_shape_is_rejected(self):
        for payload in (None, [], {}, {"entries": []}, index(), index("unexpected")):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                scraper.extract_versions(payload)

    def test_failed_retrieval_cannot_replace_catalog(self):
        with patch.object(scraper.requests, "get", side_effect=requests.Timeout), \
                patch.object(scraper, "print_error"), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        update.assert_not_called()

    def test_malformed_or_empty_response_cannot_replace_catalog(self):
        for content in (b"[invalid:", b"entries: {}", b"entries: {vsphere-cpi: []}"):
            with self.subTest(content=content), \
                    patch.object(scraper.requests, "get", return_value=Mock(content=content)), \
                    patch.object(scraper, "print_error"), \
                    patch.object(scraper, "update_compatibility_info") as update:
                scraper.scrape()
            update.assert_not_called()

    def test_valid_response_uses_the_shared_catalog_writer(self):
        response = Mock(content=b"entries:\n  vsphere-cpi:\n  - appVersion: v1.35.1\n    version: 1.35.2\n")
        with patch.object(scraper.requests, "get", return_value=response) as get, \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        get.assert_called_once_with(scraper.HELM_INDEX_URL, timeout=30)
        self.assertEqual(update.call_args.args[0], scraper.TARGET_FILE)
        self.assertEqual(update.call_args.args[1][0]["kube"], ["1.35"])


if __name__ == "__main__":
    unittest.main()
