from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "kubeedge.py"
sys.path.insert(0, str(COMPATIBILITY_DIR))

spec = importlib.util.spec_from_file_location("kubeedge", MODULE_PATH)
kubeedge = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(kubeedge)


class KubeEdgeScraperTest(unittest.TestCase):
    def test_parse_matrix_uses_exact_support_marks_only(self):
        readme = """
## Kubernetes compatibility

|                        | Kubernetes 1.27 | Kubernetes 1.28 | Kubernetes 1.29 |
|------------------------|-----------------|-----------------|-----------------|
| KubeEdge 1.21          | +               | ✓               | ✓               |
| KubeEdge 1.22          | +               | +               | ✓               |
| KubeEdge HEAD (master) | +               | +               | ✓               |

Key:
* `✓` KubeEdge and the Kubernetes version are exactly compatible.
* `+` KubeEdge has features or API objects that may not be present in the Kubernetes version.
* `-` The Kubernetes version has features or API objects that KubeEdge can't use.
"""

        self.assertEqual(
            kubeedge.parse_matrix(
                readme,
                {"1.21": "1.21.2", "1.22": "1.22.2"},
            ),
            [
                {
                    "version": "1.21.2",
                    "kube": ["1.28", "1.29"],
                    "requirements": [],
                    "incompatibilities": [],
                },
                {
                    "version": "1.22.2",
                    "kube": ["1.29"],
                    "requirements": [],
                    "incompatibilities": [],
                },
            ],
        )

    def test_parse_matrix_skips_missing_release_versions(self):
        readme = """
## Kubernetes compatibility

|               | Kubernetes 1.30 |
|---------------|-----------------|
| KubeEdge 1.24 | ✓               |
"""

        self.assertEqual(kubeedge.parse_matrix(readme, {}), [])


if __name__ == "__main__":
    unittest.main()
