import sys
import unittest
from pathlib import Path

COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY_DIR))
sys.modules.pop("utils", None)

from scrapers.volcano import (  # noqa: E402
    extract_table_data,
    latest_app_versions_by_minor,
)


class VolcanoScraperTest(unittest.TestCase):
    def test_latest_app_versions_by_minor_ignores_prereleases(self):
        versions = latest_app_versions_by_minor(
            {
                "1.15.0-alpha.0": "1.15.0-alpha.0",
                "1.15.0": "1.15.0",
                "1.15.1": "1.15.2",
                "1.14.3": "1.14.3",
            }
        )

        self.assertEqual(
            versions,
            {
                (1, 15): "1.15.1",
                (1, 14): "1.14.3",
            },
        )

    def test_extracts_only_exact_compatibility_cells(self):
        markdown = """\
| | Kubernetes 1.36 | Kubernetes 1.35 | Kubernetes 1.34 |
|---|---|---|---|
| Volcano v1.15 | - | ✓ | + |
"""

        rows = extract_table_data(
            markdown,
            {
                "1.15.0": "1.15.0",
                "1.15.1": "1.15.1",
            },
        )

        self.assertEqual(
            rows,
            [
                {
                    "version": "1.15.1",
                    "kube": ["1.35"],
                    "requirements": [],
                    "incompatibilities": [],
                }
            ],
        )


if __name__ == "__main__":
    unittest.main()
