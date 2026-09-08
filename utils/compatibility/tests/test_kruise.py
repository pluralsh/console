import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scrapers import kruise


MATRIX = """
<table><tr><th>Unrelated</th></tr><tr><td>1.99</td></tr></table>
<table><thead><tr><th>Kruise Version</th><th>1.24</th><th>1.26</th>
<th>1.28</th><th>1.30</th><th>1.32</th></tr></thead><tbody>
<tr><td>1.8.x</td><td>+</td><td>+</td><td>+</td><td>✓</td><td>?</td></tr>
<tr><td>1.9.x</td><td>?</td><td>-</td><td>+</td><td>+</td><td>✓</td></tr>
</tbody></table>
"""


def chart_index(entries):
    return yaml.safe_dump({"entries": {"kruise": entries}})


class KruiseTests(unittest.TestCase):
    def test_only_explicit_matches_without_interpolating_minors(self):
        self.assertEqual(kruise.parse_matrix(MATRIX), {(1, 8): ["1.30"], (1, 9): ["1.32"]})

    def test_preserves_multiple_explicit_matches(self):
        page = MATRIX.replace("<td>-</td>", "<td>✓</td>")
        self.assertEqual(kruise.parse_matrix(page)[(1, 9)], ["1.26", "1.32"])

    def test_rejects_changed_table_shape_and_symbols(self):
        cases = ["<p>No table</p>", MATRIX + MATRIX,
                 MATRIX.replace("<th>1.24</th>", "<th>1.26</th>"),
                 MATRIX.replace("<th>1.24</th>", "<th>latest</th>"),
                 MATRIX.replace("<td>?</td>", ""),
                 MATRIX.replace("<td>?</td>", "<td>supported</td>"),
                 MATRIX.replace("1.9.x", "1.8.x"),
                 MATRIX.replace("1.9.x", "latest"),
                 MATRIX.replace("✓", "?")]
        for page in cases:
            with self.subTest(page=page), self.assertRaises(ValueError):
                kruise.parse_matrix(page)

    def test_stable_chart_join_and_semantic_order(self):
        entries = [
            {"appVersion": "v1.9.0", "version": "1.9.2"},
            {"appVersion": "1.8.10", "version": "1.8.10"},
            {"appVersion": "1.8.2", "version": "1.8.2"},
            {"appVersion": "v1.9.0", "version": "1.9.10"},
            {"appVersion": "1.9.0-rc.1", "version": "1.9.11"},
            {"appVersion": "1.9.0", "version": "1.9.12-rc.1"},
            {"appVersion": "1.10.0", "version": "1.10.0"},
            {"appVersion": 1.9, "version": "1.9.0"},
            {"version": "1.9.0"},
        ]
        rows = kruise.build_rows(MATRIX, chart_index(entries))
        self.assertEqual([row["version"] for row in rows], ["1.9.0", "1.8.10", "1.8.2"])
        self.assertEqual(rows[0]["chart_version"], "1.9.10")
        self.assertEqual(rows[0]["kube"], ["1.32"])
        self.assertEqual(rows, kruise.build_rows(MATRIX, chart_index(list(reversed(entries)))))
        self.assertEqual(set(rows[0]), {"version", "kube", "chart_version", "requirements", "incompatibilities"})

    def test_missing_or_unusable_chart_data_fails(self):
        for index in ["null", "{}", "entries: null", "entries: []", chart_index([]), chart_index([None]),
                      chart_index([{"appVersion": "9.0.0", "version": "9.0.0"}])]:
            with self.subTest(index=index), self.assertRaises(ValueError):
                kruise.build_rows(MATRIX, index)

    def test_checked_in_metadata_and_manifest(self):
        directory = Path(__file__).resolve().parents[3] / "static" / "compatibilities"
        data = yaml.safe_load((directory / "kruise.yaml").read_text())
        manifest = yaml.safe_load((directory / "manifest.yaml").read_text())
        self.assertEqual(manifest["names"].count("kruise"), 1)
        for key in ["icon", "git_url", "release_url", "helm_repository_url"]:
            self.assertTrue(data[key].startswith("https://"))
        self.assertEqual(data["chart_name"], "kruise")
        self.assertTrue(data["versions"])
        self.assertEqual(len({row["version"] for row in data["versions"]}), len(data["versions"]))
        for row in data["versions"]:
            self.assertIsNotNone(kruise._stable_version(row["version"]))
            self.assertIsNotNone(kruise._stable_version(row["chart_version"]))
            self.assertTrue(row["kube"])
            self.assertEqual(row["requirements"], [])
            self.assertEqual(row["incompatibilities"], [])

    def test_scrape_calls_existing_writer_only_after_valid_sources(self):
        index = chart_index([{"appVersion": "v1.9.0", "version": "1.9.0"}])
        for page, payload, writes in [(MATRIX, index, 1), (None, index, 0),
                                      (MATRIX, None, 0), ("bad", index, 0), (MATRIX, "[", 0)]:
            helpers = SimpleNamespace(fetch_page=Mock(side_effect=[page, payload]),
                                      print_error=Mock(), update_compatibility_info=Mock())
            with self.subTest(page=page, payload=payload), patch.dict(sys.modules, {"utils": helpers}):
                kruise.scrape()
                self.assertEqual(helpers.update_compatibility_info.call_count, writes)
                if writes:
                    self.assertEqual(helpers.update_compatibility_info.call_args.args[0],
                                     "../../static/compatibilities/kruise.yaml")


if __name__ == "__main__":
    unittest.main()
