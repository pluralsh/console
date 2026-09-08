import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "spark_operator", Path(__file__).parents[1] / "scrapers" / "spark-operator.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

MATRIX = """## Version Matrix

| Operator Version | API Version | Kubernetes Version | Base Spark Version |
| --- | --- | --- | --- |
| `v2.3.x` | `v1beta2` | 1.16+ | `4.0.0` |
| `v2.2.x` | `v1beta2` | 1.16+ | `3.5.5` |
| `v1beta2-1.6.x-3.5.0` | `v1beta2` | 1.16+ | `3.5.0` |

## Developer Guide
| unrelated | table |
"""


class SparkOperatorTests(unittest.TestCase):
    def test_operator_not_spark_or_chart_version(self):
        rows = scraper.build_rows(MATRIX, {"2.3.0": "9.1.0", "4.0.0": "4.0.0"}, "1.18")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["version"], "2.3.0")
        self.assertEqual(rows[0]["chart_version"], "9.1.0")
        self.assertEqual(rows[0]["kube"], ["1.18", "1.17", "1.16"])

    def test_skips_undocumented_prerelease_and_legacy(self):
        rows = scraper.build_rows(MATRIX, {
            "2.2.1": "2.2.1", "2.3.0": "2.3.0", "2.5.2": "2.5.2",
            "2.3.0-rc.1": "2.3.0-rc.1", "v1beta2-1.6.2-3.5.0": "1.4.6"
        }, "1.16")
        self.assertEqual([r["version"] for r in rows], ["2.3.0", "2.2.1"])
        self.assertEqual(rows[0]["kube"], ["1.16"])

    def test_document_drift_fails_closed(self):
        for document in ["", MATRIX.replace("Kubernetes Version", "Spark Version"),
                         MATRIX.replace("1.16+", "TBD"), MATRIX.replace("v2.3.x", "latest")]:
            with self.subTest(document=document), self.assertRaises(ValueError):
                scraper.parse_matrix(document)

    def test_bounds_and_empty_matches(self):
        for charts, upper in [({"2.3.0": "2.3.0"}, "1.15"),
                              ({"2.3.0": "2.3.0"}, "2.0"), ({}, "1.36")]:
            with self.subTest(charts=charts, upper=upper), self.assertRaises(ValueError):
                scraper.build_rows(MATRIX, charts, upper)


if __name__ == "__main__":
    unittest.main()
