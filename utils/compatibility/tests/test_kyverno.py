import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scrapers import kyverno
from utils import update_compatibility_info


# Structural fixture from https://kyverno.io/docs/installation/releases/.
SUPPORT = """<table><tbody>
<tr><td>Supported Release:</td><td><strong>v1.19</strong> (released: Aug 2026)</td></tr>
<tr><td>Estimated End of Life:</td><td>v1.20 release (estimated: Nov 2026)</td></tr>
<tr><td>Kubernetes Versions Supported:</td><td>v1.33 - v1.35</td></tr>
</tbody></table>"""


class KyvernoTest(unittest.TestCase):
    def run_scrape(self, content, charts=None):
        with patch.object(kyverno, "fetch_page", return_value=content), \
             patch.object(kyverno, "get_chart_versions", return_value=charts if charts is not None else {"1.19.0": "3.9.0"}), \
             patch.object(kyverno, "update_compatibility_info") as writer:
            kyverno.scrape()
            return writer

    def test_current_release_schedule(self):
        writer = self.run_scrape(SUPPORT)
        writer.assert_called_once()
        row = writer.call_args.args[1][0]
        self.assertEqual(row["version"], "1.19.0")
        self.assertEqual(row["kube"], ["1.33", "1.34", "1.35"])
        self.assertEqual(row["chart_version"], "3.9.0")

    def test_equal_bounds_do_not_add_an_extra_minor(self):
        writer = self.run_scrape(SUPPORT.replace("v1.33 - v1.35", "v1.35 - v1.35"))
        self.assertEqual(writer.call_args.args[1][0]["kube"], ["1.35"])

    def test_malformed_or_unrelated_tables_do_not_write(self):
        for content in [None, "<table><tr><td>Other</td><td>v1.19</td></tr></table>",
                        SUPPORT.replace("v1.33 - v1.35", "v1.35 - v1.33"),
                        SUPPORT.replace("v1.33 - v1.35", "v1.33 - v2.35"),
                        SUPPORT.replace("v1.33 - v1.35", "v1.33+"),
                        SUPPORT.replace("v1.19</strong>", "v1.19-rc.1</strong>")]:
            with self.subTest(content=content):
                self.run_scrape(content).assert_not_called()

    def test_unpublished_release_does_not_write(self):
        self.run_scrape(SUPPORT, {}).assert_not_called()

    def test_legacy_matrix_still_supported(self):
        html = '<h2 id="compatibility-matrix">Compatibility Matrix</h2><table><tr><td>1.16.x</td><td>1.31</td><td>1.34</td></tr></table>'
        writer = self.run_scrape(html, {"1.16.0": "3.6.0"})
        self.assertEqual(writer.call_args.args[1][0]["version"], "1.16.0")

    def test_writer_preserves_history_metadata_and_is_repeatable(self):
        rows = self.run_scrape(SUPPORT).call_args.args[1]
        original = {"icon": "existing-icon", "versions": [{
            "version": "1.16.0", "kube": ["1.31"], "requirements": [],
            "incompatibilities": [], "summary": {"features": ["keep"]},
        }]}
        with tempfile.TemporaryDirectory() as tmp, patch("utils.summarization_enabled", return_value=False):
            output = Path(tmp) / "kyverno.yaml"
            output.write_text(yaml.safe_dump(original))
            update_compatibility_info(str(output), rows)
            first = yaml.safe_load(output.read_text())
            self.assertEqual(first["icon"], original["icon"])
            self.assertEqual(first["versions"][1], original["versions"][0])
            update_compatibility_info(str(output), rows)
            self.assertEqual(first, yaml.safe_load(output.read_text()))


if __name__ == "__main__":
    unittest.main()
