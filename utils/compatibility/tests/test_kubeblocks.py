import copy
import importlib.util
from pathlib import Path
import unittest

import yaml

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "kubeblocks.py"
spec = importlib.util.spec_from_file_location("kubeblocks", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

# Synthetic index entries isolate the release-specific lower-bound transition
# present in the official 0.8.0 and 0.8.2 charts.
ENTRIES = [
    {"version": "0.8.0", "appVersion": "0.8.0", "kubeVersion": ">=1.22.0-0"},
    {"version": "0.8.2", "appVersion": "0.8.2", "kubeVersion": ">=1.20.0-0"},
    {"version": "1.0.9", "appVersion": "1.0.1", "kubeVersion": ">=1.22.0-0"},
    {"version": "1.0.10", "appVersion": "1.0.1", "kubeVersion": ">=1.20.0-0"},
]


def index(entries):
    return yaml.safe_dump({"entries": {"kubeblocks": entries}})


class KubeBlocksTests(unittest.TestCase):
    def test_preserves_patch_level_kubernetes_requirement_changes(self):
        rows = scraper.build_rows(index(ENTRIES), "1.23")
        self.assertEqual(
            [(row["version"], row["kube"]) for row in rows],
            [
                ("1.0.1", ["1.23", "1.22", "1.21", "1.20"]),
                ("0.8.2", ["1.23", "1.22", "1.21", "1.20"]),
                ("0.8.0", ["1.23", "1.22"]),
            ],
        )

    def test_selects_newest_chart_semantically_without_conflating_app_version(self):
        rows = scraper.build_rows(index(list(reversed(ENTRIES))), "1.23")
        self.assertEqual(rows[0]["version"], "1.0.1")
        self.assertEqual(rows[0]["chart_version"], "1.0.10")

    def test_excludes_prereleases_build_metadata_deprecated_and_invalid_versions(self):
        entries = copy.deepcopy(ENTRIES[:1])
        for chart, app in [
            ("2.0.0-rc.1", "2.0.0"),
            ("2.0.0", "2.0.0-beta.1"),
            ("2.0.0+test", "2.0.0"),
            ("2.0.0", "2.0.0+test"),
            ("invalid", "2.0.0"),
            ("2.0.0", None),
        ]:
            entries.append({"version": chart, "appVersion": app, "kubeVersion": ">=1.20.0-0"})
        entries.append({"version": "2.0.0", "appVersion": "2.0.0", "deprecated": True})
        rows = scraper.build_rows(index(entries), "1.23")
        self.assertEqual([row["version"] for row in rows], ["0.8.0"])

    def test_accepts_bytes_and_v_prefixed_versions(self):
        entry = {"version": "v0.8.0", "appVersion": "v0.8.0", "kubeVersion": ">= 1.22.0"}
        rows = scraper.build_rows(index([entry]).encode(), "1.22")
        self.assertEqual(rows[0]["version"], "0.8.0")
        self.assertEqual(rows[0]["kube"], ["1.22"])

    def test_cannot_express_unsupported_constraints_as_full_minor_compatibility(self):
        for constraint in [None, "", ">=1.20.5", ">1.20.0", ">=1.20.0 <1.30.0", "garbage"]:
            with self.subTest(constraint=constraint):
                entry = dict(ENTRIES[0], kubeVersion=constraint)
                with self.assertRaises(ValueError):
                    scraper.build_rows(index([entry]), "1.23")

    def test_bad_latest_chart_does_not_silently_fall_back_to_old_requirements(self):
        entries = copy.deepcopy(ENTRIES)
        entries[-1]["kubeVersion"] = None
        with self.assertRaises(ValueError):
            scraper.build_rows(index(entries), "1.23")

    def test_future_minimum_does_not_generate_out_of_range_versions(self):
        with self.assertRaises(ValueError):
            scraper.build_rows(index(ENTRIES[:1]), "1.21")

    def test_empty_or_malformed_index_fails_instead_of_producing_empty_table(self):
        for content in ["null", "[]", "entries: {}", "entries: {kubeblocks: null}", "[", index([])]:
            with self.subTest(content=content):
                with self.assertRaises(ValueError):
                    scraper.build_rows(content, "1.23")

    def test_invalid_current_kubernetes_version_fails(self):
        for current in [None, "latest", "1.23.0", "2.0"]:
            with self.subTest(current=current):
                with self.assertRaises(ValueError):
                    scraper.build_rows(index(ENTRIES), current)


if __name__ == "__main__":
    unittest.main()
