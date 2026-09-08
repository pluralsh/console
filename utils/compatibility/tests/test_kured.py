import importlib.util
import unittest
import sys
from types import ModuleType
from unittest.mock import Mock, patch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("kured", ROOT / "scrapers/kured.py")
kured = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kured)
FIXTURE = Path(__file__).parent / "fixtures/kured-installation.md"


class KuredTests(unittest.TestCase):
    def setUp(self):
        self.content = FIXTURE.read_text()

    def test_official_matrix(self):
        matrix = kured.parse_matrix(self.content)
        self.assertEqual(len(matrix), 24)
        self.assertEqual(matrix["1.23.0"], ["1.37", "1.36", "1.35"])
        self.assertEqual(matrix["1.0.0"], ["1.8", "1.7", "1.6"])
        self.assertNotIn("1.18.0", matrix)

    def test_missing_or_changed_table_rejected(self):
        for body in ["", "# Error", self.content.replace("expected kubernetes compatibility", "tested versions")]:
            with self.subTest(body=body[:30]), self.assertRaises(ValueError):
                kured.parse_matrix(body)

    def test_unsupported_cells_rejected(self):
        for token in ["", "1.35.x - 1.37.x", "1.35.x, unknown", "latest"]:
            with self.subTest(token=token), self.assertRaises(ValueError):
                kured.parse_matrix(self.content.replace("1.35.x, 1.36.x, 1.37.x", token))

    def test_duplicate_release_rejected(self):
        with self.assertRaises(ValueError):
            kured.parse_matrix(self.content.replace("| 1.22.1 |", "| 1.23.0 |"))

    def test_missing_column_rejected(self):
        with self.assertRaises(ValueError):
            kured.parse_matrix(self.content.replace("| v0.36.2             |", ""))

    def test_exact_stable_chart_mapping_and_numeric_order(self):
        entries = [
            {"appVersion": "v1.23.0", "version": "6.9.0"},
            {"appVersion": "1.23.0", "version": "6.10.0"},
            {"appVersion": "1.23.0", "version": "7.0.0-rc1"},
            {"appVersion": "1.22.1-rc1", "version": "6.0.0"},
            {"appVersion": "1.18.0", "version": "5.0.0"},
            {"appVersion": "1.9.2", "version": "2.0.0"},
        ]
        rows = kured.build_versions(kured.parse_matrix(self.content), entries)
        self.assertEqual([row["version"] for row in rows], ["1.23.0", "1.9.2"])
        self.assertEqual(rows[0]["chart_version"], "6.10.0")
        self.assertEqual(rows[1]["kube"], ["1.23", "1.22", "1.21"])

    def test_empty_invalid_or_unmatched_charts_rejected(self):
        for entries in [None, {}, [], [None], [{"appVersion": "9.0.0", "version": "9.0.0"}]]:
            with self.subTest(entries=entries), self.assertRaises(ValueError):
                kured.build_versions(kured.parse_matrix(self.content), entries)

    def test_source_failure_does_not_call_writer(self):
        utils = ModuleType("utils")
        utils.update_compatibility_info = Mock()
        for responses in [OSError("offline"), [self.content, OSError("offline")]]:
            with self.subTest(responses=responses), patch.dict(sys.modules, {"utils": utils}):
                with patch.object(kured, "fetch_text", side_effect=responses), self.assertRaises(OSError):
                    kured.scrape()
            utils.update_compatibility_info.assert_not_called()

    def test_scrape_validates_both_sources_before_writer(self):
        utils = ModuleType("utils")
        utils.update_compatibility_info = Mock()
        index = 'entries:\n  kured:\n  - appVersion: 1.23.0\n    version: 6.1.0\n'
        with patch.dict(sys.modules, {"utils": utils}), patch.object(kured, "fetch_text", side_effect=[self.content, index]):
            kured.scrape()
        utils.update_compatibility_info.assert_called_once()
        path, rows = utils.update_compatibility_info.call_args.args
        self.assertEqual(path, kured.TARGET_FILE)
        self.assertEqual(rows[0]["chart_version"], "6.1.0")

    def test_generated_table_and_aggregate_match_sources(self):
        import yaml
        repo = ROOT.parents[1]
        addon = yaml.safe_load((repo / "static/compatibilities/kured.yaml").read_text())
        matrix = kured.parse_matrix(self.content)
        index = yaml.safe_load((FIXTURE.parent / "kured-index.yaml").read_text())
        self.assertEqual(addon["versions"], kured.build_versions(matrix, index["entries"]["kured"]))
        self.assertEqual(len(addon["versions"]), 20)
        for row in addon["versions"]:
            self.assertEqual(row["kube"], matrix[row["version"]])
            self.assertIsNotNone(kured.version_key(row["chart_version"]))
        manifest = yaml.safe_load((repo / "static/compatibilities/manifest.yaml").read_text())
        self.assertEqual(manifest["names"].count("kured"), 1)
        aggregate = yaml.safe_load((repo / "static/compatibilities.yaml").read_text())
        matches = [a for a in aggregate["addons"] if a["name"] == "kured"]
        self.assertEqual(matches, [{**addon, "name": "kured"}])


if __name__ == "__main__":
    unittest.main()
