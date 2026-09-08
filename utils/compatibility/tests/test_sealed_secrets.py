from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "sealed-secrets.py"
sys.path.insert(0, str(COMPATIBILITY_DIR))

utils_spec = importlib.util.spec_from_file_location("utils", COMPATIBILITY_DIR / "utils.py")
compat_utils = importlib.util.module_from_spec(utils_spec)
assert utils_spec.loader is not None
utils_spec.loader.exec_module(compat_utils)

utils_module = sys.modules.get("utils")
if utils_module is None:
    sys.modules["utils"] = compat_utils
else:
    for name in (
        "current_kube_version",
        "fetch_page",
        "print_error",
        "read_yaml",
        "update_compatibility_info",
        "validate_semver",
        "write_yaml",
    ):
        setattr(utils_module, name, getattr(compat_utils, name))

spec = importlib.util.spec_from_file_location("sealed_secrets", MODULE_PATH)
sealed_secrets = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(sealed_secrets)


class SealedSecretsScraperTest(unittest.TestCase):
    def test_parse_kube_constraint_expands_minimum_to_current_kubernetes(self):
        self.assertEqual(
            sealed_secrets.parse_kube_constraint(">=1.16.0-0", "1.36"),
            [
                "1.16",
                "1.17",
                "1.18",
                "1.19",
                "1.20",
                "1.21",
                "1.22",
                "1.23",
                "1.24",
                "1.25",
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

    def test_parse_kube_constraint_keeps_patch_overlap(self):
        self.assertEqual(
            sealed_secrets.parse_kube_constraint(">=1.16.0 <1.19.1", "1.36"),
            ["1.16", "1.17", "1.18", "1.19"],
        )
        self.assertEqual(
            sealed_secrets.parse_kube_constraint(">1.16.0 <=1.18.0", "1.36"),
            ["1.16", "1.17", "1.18"],
        )

    def test_extract_rows_uses_sealed_secrets_chart_and_stable_app_versions(self):
        index_yaml = {
            "entries": {
                "not-sealed-secrets": [
                    {
                        "version": "2.19.3",
                        "appVersion": "0.39.1",
                        "kubeVersion": ">=1.16.0-0",
                    }
                ],
                "sealed-secrets": [
                    {
                        "version": "2.19.3",
                        "appVersion": "0.39.1",
                        "kubeVersion": ">=1.16.0-0",
                    },
                    {
                        "version": "2.19.2",
                        "appVersion": "0.39.0",
                        "kubeVersion": ">=1.16.0-0",
                    },
                    {
                        "version": "2.19.1",
                        "appVersion": "0.38.4",
                        "kubeVersion": ">=1.16.0-0",
                    },
                    {
                        "version": "2.18.0-rc.1",
                        "appVersion": "0.37.0-rc.1",
                        "kubeVersion": ">=1.16.0-0",
                    },
                    {
                        "version": "2.12.0",
                        "appVersion": "0.27.3",
                        "kubeVersion": ">=1.24.0-0",
                    },
                ],
            }
        }

        rows = sealed_secrets.extract_rows(index_yaml, "1.36")

        self.assertEqual(
            [row["version"] for row in rows],
            ["0.39.1", "0.38.4", "0.27.3"],
        )
        self.assertEqual(
            [row["chart_version"] for row in rows],
            ["2.19.3", "2.19.1", "2.12.0"],
        )
        self.assertEqual(rows[0]["kube"][0], "1.16")
        self.assertEqual(rows[0]["kube"][-1], "1.36")
        self.assertEqual(rows[-1]["kube"][0], "1.24")

    def test_representative_rows_keep_kubernetes_semantic_changes(self):
        rows = [
            {"version": "0.39.1", "kube": ["1.16", "1.17"], "chart_version": "2.19.3"},
            {"version": "0.39.0", "kube": ["1.16", "1.17"], "chart_version": "2.19.2"},
            {"version": "0.39.0", "kube": ["1.24", "1.25"], "chart_version": "2.19.1"},
        ]

        selected = sealed_secrets._representative_rows(rows)

        self.assertEqual([row["version"] for row in selected], ["0.39.1", "0.39.0"])

    def test_prune_stale_representatives_removes_old_patch_rows(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "sealed-secrets.yaml"
            path.write_text(
                """
versions:
- version: 0.39.0
  summary: old
- version: 0.39.1
  summary: current
""",
                encoding="utf-8",
            )

            sealed_secrets.prune_stale_representatives(
                path,
                [{"version": "0.39.1"}],
            )

            self.assertNotIn("0.39.0", path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
