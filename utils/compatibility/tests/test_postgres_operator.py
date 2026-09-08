import importlib.util
from pathlib import Path
from types import ModuleType
import unittest
from unittest.mock import Mock, patch

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "postgres-operator.py"
spec = importlib.util.spec_from_file_location("postgres_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

FIXTURE = """<!doctype html>
<html><body>
<h2>Supported Postgres &amp; K8s versions</h2>
<table>
<thead><tr><th>Release</th><th>Postgres versions</th><th>K8s versions</th><th>Golang</th></tr></thead>
<tbody>
<tr><td>v2.0.2</td><td>14 → 18</td><td>1.27+</td><td>1.26.4</td></tr>
<tr><td>v1.15.1</td><td>13 → 17</td><td>1.27+</td><td>1.25.3</td></tr>
<tr><td>v1.14.0</td><td>13 → 17</td><td>1.27+</td><td>1.23.4</td></tr>
<tr><td>v1.13.0</td><td>12 → 16</td><td>1.27+</td><td>1.22.5</td></tr>
<tr><td>v1.12.0</td><td>11 → 16</td><td>1.27+</td><td>1.22.3</td></tr>
<tr><td>v1.11.0</td><td>11 → 16</td><td>1.27+</td><td>1.21.7</td></tr>
</tbody></table>
</body></html>"""

CHARTS = {
    "2.0.2": "2.0.2",
    "1.15.1": "1.15.1",
    "1.14.0": "1.14.0",
    "1.13.0": "1.13.0",
    "1.11.0": "1.11.0",
}


class PostgresOperatorTests(unittest.TestCase):
    def test_current_table_parses_verified_helm_releases(self):
        rows = scraper.parse_compatibility_table(FIXTURE, CHARTS, "1.36")
        self.assertEqual([row["version"] for row in rows], list(CHARTS))
        self.assertEqual(rows[0]["kube"][0], "1.36")
        self.assertEqual(rows[0]["kube"][-1], "1.27")
        self.assertEqual(len(rows[0]["kube"]), 10)
        self.assertEqual(rows[0]["chart_version"], "2.0.2")

    def test_heading_text_can_move_if_headers_remain_stable(self):
        html = FIXTURE.replace(
            "<h2>Supported Postgres &amp; K8s versions</h2>",
            "<h2>Compatibility</h2>",
        )
        rows = scraper.parse_compatibility_table(html, CHARTS, "1.36")
        self.assertEqual(rows[0]["version"], "2.0.2")

    def test_missing_table_fails_before_writing(self):
        with self.assertRaisesRegex(ValueError, "table not found"):
            scraper.parse_compatibility_table("<html></html>", CHARTS, "1.36")

    def test_malformed_release_fails_closed(self):
        html = FIXTURE.replace("v2.0.2", "latest", 1)
        with self.assertRaisesRegex(ValueError, "Unsupported Zalando release"):
            scraper.parse_compatibility_table(html, CHARTS, "1.36")

    def test_invalid_kube_range_fails_closed(self):
        html = FIXTURE.replace("1.27+", "Kubernetes latest", 1)
        with self.assertRaisesRegex(ValueError, "Unsupported Kubernetes range"):
            scraper.parse_compatibility_table(html, CHARTS, "1.36")

    def test_future_minimum_does_not_invent_support(self):
        html = FIXTURE.replace("1.27+", "1.40+", 1)
        with self.assertRaisesRegex(ValueError, "exceeds current"):
            scraper.parse_compatibility_table(html, CHARTS, "1.36")

    def test_unpublished_chart_release_is_skipped(self):
        charts = dict(CHARTS)
        del charts["1.14.0"]
        rows = scraper.parse_compatibility_table(FIXTURE, charts, "1.36")
        self.assertNotIn("1.14.0", [row["version"] for row in rows])
        self.assertNotIn("1.12.0", [row["version"] for row in rows])

    def test_scrape_connects_official_source_to_shared_updater(self):
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(return_value=FIXTURE.encode("utf-8"))
        helpers.get_chart_versions = Mock(return_value=CHARTS)
        helpers.current_kube_version = Mock(return_value="1.36")
        helpers.update_compatibility_info = Mock()

        with patch.dict("sys.modules", {"utils": helpers}):
            scraper.scrape()

        helpers.fetch_page.assert_called_once_with(scraper.compatibility_url)
        helpers.get_chart_versions.assert_called_once_with("postgres-operator")
        rows = helpers.update_compatibility_info.call_args.args[1]
        self.assertEqual(rows[0]["version"], "2.0.2")
        self.assertEqual(rows[-1]["version"], "1.11.0")


if __name__ == "__main__":
    unittest.main()
