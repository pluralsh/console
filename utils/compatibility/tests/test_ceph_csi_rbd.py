import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY_DIR))
spec = importlib.util.spec_from_file_location(
    "ceph_csi_rbd", COMPATIBILITY_DIR / "scrapers" / "ceph-csi-rbd.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

MATRIX = """# Example
## Known to work CO platforms
| Ceph CSI Version | Container Orchestrator Name | Version Tested |
| --- | --- | --- |
| devel (v3.18.0) | Kubernetes | v1.34, v1.35, v1.36 |
| v3.17.1 | Kubernetes | v1.34, v1.35, v1.36 |
| v3.17.0 | Kubernetes | v1.33, v1.34, v1.35 |
| v3.16.0 | Kubernetes | v1.32, v1.33, v1.34 |
## Support Matrix
| Feature | Kubernetes |
| --- | --- |
| RBD | >= v1.14.0 |
"""


def index(entries=None):
    if entries is None:
        entries = [
            {"name": "ceph-csi-rbd", "appVersion": v, "version": v}
            for v in ["3.17.1", "3.17.0", "3.16.0", "3.17-canary"]
        ]
    return yaml.safe_dump({"entries": {"ceph-csi-rbd": entries}})


class CephCSIRBDScraperTests(unittest.TestCase):
    def test_patch_releases_keep_distinct_tested_minors(self):
        matrix = scraper.parse_matrix(MATRIX)
        self.assertEqual(matrix["3.17.1"], ["1.36", "1.35", "1.34"])
        self.assertEqual(matrix["3.17.0"], ["1.35", "1.34", "1.33"])
        self.assertNotIn("3.18.0", matrix)
        self.assertNotIn("1.14", matrix["3.17.1"])

    def test_unsupported_and_conflicting_matrix_data_fail(self):
        variants = [
            MATRIX.replace("Version Tested", "Minimum Version"),
            MATRIX.replace("v1.34, v1.35, v1.36", ">= v1.34"),
            MATRIX.replace("v3.17.0 | Kubernetes", "v3.17.1 | Kubernetes"),
            MATRIX.replace("v3.17.0 | Kubernetes", "v3.17.0 | Nomad"),
            MATRIX.replace("v1.33, v1.34, v1.35", "v1.33, v1.33"),
            MATRIX.replace("v3.17.0 | Kubernetes |", "v3.17.0 |"),
            MATRIX.replace("v1.33, v1.34, v1.35", "v1.33.2, v1.34"),
            "No published matrix",
        ]
        for text in variants:
            with self.subTest(text=text), self.assertRaises(ValueError):
                scraper.parse_matrix(text)

    def test_chart_version_is_separate_and_semantically_sorted(self):
        entries = [
            {"name": "ceph-csi-rbd", "appVersion": app, "version": chart}
            for app, chart in [("v3.17.1", "4.9.0"), ("3.17.1", "4.10.0"),
                               ("3.17.1", "4.11.0-rc.1"), ("3.18.0-rc.1", "4.12.0")]
        ]
        self.assertEqual(scraper.parse_chart_versions(index(entries)), {"3.17.1": "4.10.0"})

    def test_missing_or_wrong_chart_identity_fails(self):
        for text in ["entries: {}", index([]), index([{"name": "ceph-csi-cephfs", "appVersion": "3.17.1", "version": "3.17.1"}])]:
            with self.subTest(text=text), self.assertRaises((KeyError, ValueError)):
                scraper.parse_chart_versions(text)

    def test_only_explicit_matrix_and_chart_intersection_is_used(self):
        rows = scraper.build_rows(scraper.parse_matrix(MATRIX), {"3.17.0": "3.17.0", "3.18.0": "3.18.0"})
        self.assertEqual([row["version"] for row in rows], ["3.17.0"])
        self.assertEqual(rows[0]["kube"], ["1.35", "1.34", "1.33"])
        with self.assertRaises(ValueError):
            scraper.build_rows(scraper.parse_matrix(MATRIX), {"3.18.0": "3.18.0"})

    def test_source_failure_never_reaches_catalog_writer(self):
        with patch.object(scraper, "fetch", side_effect=[MATRIX, RuntimeError("network failed")]), patch.object(scraper, "update_compatibility_info") as write:
            with self.assertRaises(RuntimeError):
                scraper.scrape()
            write.assert_not_called()

    def test_image_failure_never_reaches_catalog_writer(self):
        with patch.object(scraper, "fetch", side_effect=[MATRIX, index()]), patch.object(scraper, "get_chart_images", side_effect=[["quay.io/cephcsi/cephcsi:v3.17.1"], None]), patch.object(scraper, "update_compatibility_info") as write:
            with self.assertRaises(ValueError):
                scraper.scrape()
            write.assert_not_called()

    def test_success_hands_complete_rows_to_existing_pipeline(self):
        with patch.object(scraper, "fetch", side_effect=[MATRIX, index()]), patch.object(scraper, "get_chart_images", return_value=["quay.io/cephcsi/cephcsi:v3.17.1"]), patch.object(scraper, "update_compatibility_info") as write:
            scraper.scrape()
            path, rows = write.call_args.args
            self.assertEqual(path, scraper.CATALOG_PATH)
            self.assertEqual(len(rows), 3)
            self.assertTrue(all(row["images"] for row in rows))


if __name__ == "__main__":
    unittest.main()
