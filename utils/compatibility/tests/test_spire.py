from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "spire.py"
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
        "get_chart_images",
        "print_error",
        "read_yaml",
        "update_compatibility_info",
        "validate_semver",
        "write_yaml",
    ):
        setattr(utils_module, name, getattr(compat_utils, name))

spec = importlib.util.spec_from_file_location("spire", MODULE_PATH)
spire = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(spire)


class SpireScraperTest(unittest.TestCase):
    def test_parse_kube_constraint_expands_minimum_to_current_kubernetes(self):
        self.assertEqual(
            spire.parse_kube_constraint(">=1.21.0-0", "1.36"),
            [
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
            spire.parse_kube_constraint(">=1.21.0 <1.24.1", "1.36"),
            ["1.21", "1.22", "1.23", "1.24"],
        )
        self.assertEqual(
            spire.parse_kube_constraint(">1.21.0 <=1.23.0", "1.36"),
            ["1.21", "1.22", "1.23"],
        )

    def test_extract_rows_uses_spire_chart_and_newest_chart_for_app_version(self):
        index_yaml = {
            "entries": {
                "spire-agent": [
                    {
                        "version": "0.30.1",
                        "appVersion": "1.15.3",
                        "kubeVersion": ">=1.21.0-0",
                    }
                ],
                "spire": [
                    {
                        "version": "0.30.1",
                        "appVersion": "1.15.3",
                        "kubeVersion": ">=1.21.0-0",
                    },
                    {
                        "version": "0.30.0",
                        "appVersion": "1.14.5",
                        "kubeVersion": ">=1.21.0-0",
                    },
                    {
                        "version": "0.29.0",
                        "appVersion": "1.14.5",
                        "kubeVersion": ">=1.21.0-0",
                    },
                    {
                        "version": "0.28.0-rc.1",
                        "appVersion": "1.14.1-rc.1",
                        "kubeVersion": ">=1.21.0-0",
                    },
                    {
                        "version": "0.20.0",
                        "appVersion": "1.8.7",
                        "kubeVersion": ">=1.19.0-0",
                    },
                ],
            }
        }

        original = spire._chart_images_for_version
        spire._chart_images_for_version = lambda version: {
            "0.30.1": [
                "ghcr.io/spiffe/spire-server:1.15.3",
                "ghcr.io/spiffe/spire-agent:1.15.3",
            ],
            "0.30.0": [
                "ghcr.io/spiffe/spire-server:1.15.2",
                "ghcr.io/spiffe/spire-agent:1.15.2",
            ],
            "0.29.0": [
                "ghcr.io/spiffe/spire-server:1.14.5",
                "ghcr.io/spiffe/spire-agent:1.14.5",
            ],
            "0.28.0-rc.1": ["ghcr.io/spiffe/spire-server:1.14.1-rc.1"],
            "0.20.0": [
                "ghcr.io/spiffe/spire-server:1.8.7",
                "ghcr.io/spiffe/spire-agent:1.8.7",
            ],
        }.get(version, [])
        try:
            rows = spire.extract_rows(index_yaml, "1.36")
        finally:
            spire._chart_images_for_version = original

        self.assertEqual(
            [row["version"] for row in rows],
            ["1.15.3", "1.14.5", "1.8.7"],
        )
        self.assertEqual(
            [row["chart_version"] for row in rows],
            ["0.30.1", "0.29.0", "0.20.0"],
        )
        self.assertEqual(rows[0]["kube"][0], "1.21")
        self.assertEqual(rows[0]["kube"][-1], "1.36")
        self.assertEqual(rows[-1]["kube"][0], "1.19")

    def test_representative_rows_keep_kubernetes_semantic_changes(self):
        rows = [
            {"version": "1.15.3", "kube": ["1.21", "1.22"], "chart_version": "0.30.1"},
            {"version": "1.15.2", "kube": ["1.21", "1.22"], "chart_version": "0.30.0"},
            {"version": "1.15.1", "kube": ["1.19", "1.20"], "chart_version": "0.29.0"},
        ]

        selected = spire._representative_rows(rows)

        self.assertEqual([row["version"] for row in selected], ["1.15.3", "1.15.1"])

    def test_prune_stale_representatives_removes_old_patch_rows(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "spire.yaml"
            path.write_text(
                """
versions:
- version: 1.15.2
  summary: null
- version: 1.15.3
  summary: current
""",
                encoding="utf-8",
            )

            spire.prune_stale_representatives(path, [{"version": "1.15.3"}])

            self.assertNotIn("1.15.2", path.read_text(encoding="utf-8"))

    def test_prune_stale_representatives_preserves_curated_rows(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "spire.yaml"
            path.write_text(
                """
versions:
- version: 1.15.2
  requirements: [manual note]
- version: 1.15.3
  summary: current
""",
                encoding="utf-8",
            )

            spire.prune_stale_representatives(path, [{"version": "1.15.3"}])

            self.assertIn("1.15.2", path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
