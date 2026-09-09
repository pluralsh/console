from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "volsync.py"
sys.path.insert(0, str(COMPATIBILITY_DIR))

spec = importlib.util.spec_from_file_location("volsync", MODULE_PATH)
volsync = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(volsync)


class VolSyncScraperTest(unittest.TestCase):
    def test_expand_kube_version_expands_caret_range(self):
        self.assertEqual(
            volsync.expand_kube_version("^1.20.0-0", "1.25"),
            ["1.25", "1.24", "1.23", "1.22", "1.21", "1.20"],
        )

    def test_expand_kube_version_handles_non_matching_input(self):
        self.assertEqual(volsync.expand_kube_version("invalid", "1.25"), [])

    def test_parse_volsync_entries_filters_prereleases_and_extracts_stable(self):
        sample_yaml = """
entries:
  volsync:
  - version: 0.16.0
    appVersion: 0.16.0
    kubeVersion: "^1.20.0-0"
  - version: 0.15.0-rc.1
    appVersion: 0.15.0-rc.1
    kubeVersion: "^1.20.0-0"
  - version: 0.15.0
    appVersion: 0.15.0
    kubeVersion: "^1.20.0-0"
  - version: 0.3.0
    appVersion: 0.3.0
    kubeVersion: "^1.17.0-0"
"""
        rows = volsync.parse_volsync_entries(sample_yaml, "1.22")
        self.assertEqual(len(rows), 3)

        # First entry: 0.16.0
        self.assertEqual(rows[0]["version"], "0.16.0")
        self.assertEqual(rows[0]["chart_version"], "0.16.0")
        self.assertEqual(rows[0]["kube"], ["1.22", "1.21", "1.20"])
        self.assertEqual(rows[0]["requirements"][0]["name"], "CSI VolumeSnapshot")

        # Second entry: 0.15.0 (0.15.0-rc.1 skipped)
        self.assertEqual(rows[1]["version"], "0.15.0")
        self.assertEqual(rows[1]["kube"], ["1.22", "1.21", "1.20"])

        # Third entry: 0.3.0
        self.assertEqual(rows[2]["version"], "0.3.0")
        self.assertEqual(rows[2]["kube"], ["1.22", "1.21", "1.20", "1.19", "1.18", "1.17"])

    def test_parse_volsync_entries_handles_malformed_yaml(self):
        self.assertEqual(volsync.parse_volsync_entries("::malformed::", "1.25"), [])


if __name__ == "__main__":
    unittest.main()
