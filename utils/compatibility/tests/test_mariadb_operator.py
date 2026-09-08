from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "mariadb-operator.py"
sys.path.insert(0, str(COMPATIBILITY_DIR))

spec = importlib.util.spec_from_file_location("mariadb_operator", MODULE_PATH)
mariadb_operator = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mariadb_operator)


class MariaDBOperatorScraperTest(unittest.TestCase):
    def test_parse_kube_constraint_expands_minimum_to_current_kubernetes(self):
        self.assertEqual(
            mariadb_operator.parse_kube_constraint(">=1.26.0-0", "1.36"),
            [
                "1.26",
                "1.27",
                "1.28",
                "1.29",
                "1.30",
                "1.31",
                "1.32",
                "1.33",
                "1.34",
                "1.35",
                "1.36",
            ],
        )

    def test_parse_kube_constraint_honors_upper_boundaries(self):
        self.assertEqual(
            mariadb_operator.parse_kube_constraint(">=1.26.0-0 <1.29.0-0", "1.36"),
            ["1.26", "1.27", "1.28"],
        )

    def test_parse_kube_constraint_keeps_minors_with_valid_patch_overlap(self):
        self.assertEqual(
            mariadb_operator.parse_kube_constraint(">=1.26.0 <1.29.1", "1.36"),
            ["1.26", "1.27", "1.28", "1.29"],
        )
        self.assertEqual(
            mariadb_operator.parse_kube_constraint(">1.26.0 <=1.28.0", "1.36"),
            ["1.26", "1.27", "1.28"],
        )

    def test_extract_rows_uses_only_the_operator_chart_and_stable_app_versions(self):
        index_yaml = {
            "entries": {
                "mariadb-cluster": [
                    {
                        "version": "26.6.0",
                        "appVersion": "0.0.0",
                        "kubeVersion": ">=1.26.0-0",
                    }
                ],
                "mariadb-operator": [
                    {
                        "version": "26.6.0",
                        "appVersion": "26.6.0",
                        "kubeVersion": ">=1.26.0-0",
                    },
                    {
                        "version": "25.10.4",
                        "appVersion": "25.10.4",
                        "kubeVersion": ">=1.26.0-0",
                    },
                    {
                        "version": "25.10.0",
                        "appVersion": "25.10.0",
                        "kubeVersion": ">=1.26.0-0",
                    },
                    {
                        "version": "26.3.0",
                        "appVersion": "26.3.0",
                        "kubeVersion": ">=1.26.0-0",
                    },
                    {
                        "version": "26.3.0-rc.0",
                        "appVersion": "26.3.0-rc.0",
                        "kubeVersion": ">=1.26.0-0",
                    },
                    {
                        "version": "0.33.0",
                        "appVersion": "v0.0.33",
                        "kubeVersion": ">=1.26.0-0",
                    },
                    {
                        "version": "0.30.0",
                        "appVersion": "v0.0.30",
                        "kubeVersion": ">=1.16.0-0",
                    },
                ],
                "mariadb-operator-crds": [
                    {
                        "version": "26.6.0",
                        "appVersion": "0.0.0",
                        "kubeVersion": ">=1.26.0-0",
                    }
                ],
            }
        }

        rows = mariadb_operator.extract_rows(index_yaml, "1.36")

        self.assertEqual(
            [row["version"] for row in rows],
            ["26.6.0", "26.3.0", "25.10.4", "0.0.33", "0.0.30"],
        )
        self.assertEqual(
            [row["chart_version"] for row in rows],
            ["26.6.0", "26.3.0", "25.10.4", "0.33.0", "0.30.0"],
        )
        self.assertEqual(rows[0]["kube"][0], "1.26")
        self.assertEqual(rows[0]["kube"][-1], "1.36")
        self.assertEqual(rows[-1]["kube"][0], "1.16")

    def test_prune_stale_representatives_removes_old_patch_rows(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "mariadb-operator.yaml"
            path.write_text(
                """
versions:
- version: 25.10.0
  summary: old
- version: 25.10.4
  summary: current
""",
                encoding="utf-8",
            )

            mariadb_operator.prune_stale_representatives(
                path,
                [{"version": "25.10.4"}],
            )

            self.assertNotIn("25.10.0", path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
