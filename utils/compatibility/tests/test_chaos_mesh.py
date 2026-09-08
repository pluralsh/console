from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "chaos-mesh.py"
sys.path.insert(0, str(COMPATIBILITY_DIR))

spec = importlib.util.spec_from_file_location("chaos_mesh", MODULE_PATH)
chaos_mesh = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(chaos_mesh)


class ChaosMeshScraperTest(unittest.TestCase):
    def test_parse_support_matrix_reads_the_supported_release_table(self):
        content = """
<table><thead><tr>
  <th>Version<th>Currently Supported<th>Release Date<th>End of Life<th>Supported Kubernetes versions
<tbody>
  <tr><td>master<td>No<td>-<td>-<td>1.33, 1.34
  <tr><td>2.8<td><code>Yes</code><td>Oct 01, 2025<td>-<td>1.30, 1.31, 1.32
  <tr><td>2.7<td><code>Yes</code><td>Sep 20, 2024<td>-<td>1.26, 1.27, 1.28
</table>
"""

        self.assertEqual(
            chaos_mesh.parse_support_matrix(content),
            {
                "2.8": ["1.30", "1.31", "1.32"],
                "2.7": ["1.26", "1.27", "1.28"],
            },
        )

    def test_parse_support_matrix_ignores_the_e2e_test_table(self):
        content = """
<table>
  <thead><tr><th>Version</th><th>Tested kubernetes Versions</th></tr></thead>
  <tbody><tr><td>2.8</td><td>1.33.9, 1.34.5</td></tr></tbody>
</table>
"""

        self.assertEqual(chaos_mesh.parse_support_matrix(content), {})

    def test_build_rows_maps_chart_patches_to_their_release_minor(self):
        rows = chaos_mesh.build_rows(
            {
                "2.8.4": "2.8.4",
                "2.7.3": "2.7.3",
                "3.0.0-alpha.1": "3.0.0-alpha.1",
            },
            {
                "2.8": ["1.30", "1.31", "1.32"],
                "2.7": ["1.26", "1.27", "1.28"],
            },
        )

        self.assertEqual(rows[0]["version"], "2.8.4")
        self.assertEqual(rows[0]["kube"], ["1.30", "1.31", "1.32"])
        self.assertEqual(rows[0]["chart_version"], "2.8.4")
        self.assertEqual(rows[1]["version"], "2.7.3")
        self.assertEqual(rows[1]["kube"], ["1.26", "1.27", "1.28"])
        self.assertEqual(len(rows), 2)


if __name__ == "__main__":
    unittest.main()
