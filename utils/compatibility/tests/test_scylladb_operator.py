from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "scylladb-operator.py"
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
        "expand_kube_versions",
        "get_chart_versions",
        "print_error",
        "update_compatibility_info",
    ):
        setattr(utils_module, name, getattr(compat_utils, name))

spec = importlib.util.spec_from_file_location("scylladb_operator", MODULE_PATH)
scylladb_operator = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(scylladb_operator)


class ScyllaDBOperatorScraperTest(unittest.TestCase):
    def test_parse_kubernetes_support_expands_range(self):
        markdown = """
## Support matrix
| Component | Supported versions |
|-----------|--------------------|
| Kubernetes | 1.33 - 1.36 |
| ScyllaDB | 2025.1, 2026.1 - 2026.3 |
"""

        self.assertEqual(
            scylladb_operator.parse_kubernetes_support(markdown),
            ["1.33", "1.34", "1.35", "1.36"],
        )

    def test_parse_kubernetes_support_handles_mixed_lists_and_ranges(self):
        markdown = """
## Support matrix
| Component | Supported versions |
|-----------|--------------------|
| Kubernetes | 1.31, 1.33 - 1.35 |
"""

        self.assertEqual(
            scylladb_operator.parse_kubernetes_support(markdown),
            ["1.31", "1.33", "1.34", "1.35"],
        )

    def test_build_rows_uses_only_versions_with_published_docs(self):
        docs = {
            "1.22": """
## Support matrix
| Component | Supported versions |
|-----------|--------------------|
| Kubernetes | 1.33 - 1.36 |
""",
            "1.21": """
## Support matrix
| Component | Supported versions |
|-----------|--------------------|
| Kubernetes | 1.32 - 1.35 |
""",
        }

        with patch.object(scylladb_operator, "_docs_for_minor", side_effect=lambda minor: docs.get(minor)):
            rows = scylladb_operator.build_rows(
                {
                    "1.22": "1.22.0",
                    "1.21": "1.21.1",
                    "1.20": "1.20.3",
                },
                {
                    "1.22.0": "1.22.0",
                    "1.21.1": "1.21.1",
                    "1.20.3": "1.20.3",
                },
            )

        self.assertEqual([row["version"] for row in rows], ["1.22.0", "1.21.1"])
        self.assertEqual(rows[0]["kube"], ["1.33", "1.34", "1.35", "1.36"])
        self.assertEqual(rows[0]["chart_version"], "1.22.0")
        self.assertEqual(rows[0]["images"], ["docker.io/scylladb/scylla-operator:1.22.0"])
        self.assertEqual(rows[1]["kube"], ["1.32", "1.33", "1.34", "1.35"])


if __name__ == "__main__":
    unittest.main()
