import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scrapers import openkruise
from utils import find_nested_images


FIXTURE = Path(__file__).parent / "fixtures" / "openkruise-matrix.html"


class OpenKruiseTests(unittest.TestCase):
    def setUp(self):
        self.content = FIXTURE.read_bytes()

    def test_official_matrix_keeps_only_exact_api_matches(self):
        self.assertEqual(openkruise.parse_compatibility_matrix(self.content), {
            "1.4": ["1.22"],
            "1.5": ["1.24"],
            "1.6": ["1.26"],
            "1.7": ["1.28"],
            "1.8": ["1.30"],
            "1.9": ["1.32"],
        })

    def test_ignores_unrelated_tables(self):
        unrelated = b"<table><tr><th>Option</th></tr><tr><td>foo</td></tr></table>"
        self.assertEqual(
            openkruise.parse_compatibility_matrix(unrelated + self.content + unrelated),
            openkruise.parse_compatibility_matrix(self.content),
        )

    def test_missing_matrix_fails(self):
        with self.assertRaisesRegex(ValueError, "not found"):
            openkruise.parse_compatibility_matrix("<html>Unavailable</html>")

    def test_changed_header_fails(self):
        with self.assertRaisesRegex(ValueError, "columns"):
            openkruise.parse_compatibility_matrix(self.content.replace(b"1.18", b"latest", 1))

    def test_unknown_mark_fails(self):
        with self.assertRaisesRegex(ValueError, "mark"):
            openkruise.parse_compatibility_matrix(self.content.replace(b"?", b"TBD", 1))

    def test_short_row_fails(self):
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(self.content, "html.parser")
        soup.find_all("tr")[1].find_all("td")[-1].decompose()
        with self.assertRaisesRegex(ValueError, "row length"):
            openkruise.parse_compatibility_matrix(str(soup))

    def test_duplicate_family_fails(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            openkruise.parse_compatibility_matrix(self.content.replace(b"1.5.x", b"1.4.x"))

    def test_no_exact_matches_fails(self):
        with self.assertRaisesRegex(ValueError, "No exact"):
            openkruise.parse_compatibility_matrix(self.content.replace("✓".encode(), b"?"))

    def test_chart_join_uses_app_version_and_skips_unreleased_or_unknown_versions(self):
        matrix = openkruise.parse_compatibility_matrix(self.content)
        rows = openkruise.extract_table_data(matrix, {
            "1.8.3": "9.0.0",  # Chart version need not equal application version.
            "1.9.0": "9.1.0",
            "1.9.1-rc.1": "9.2.0",
            "1.9.2": "9.3.0-beta.1",
            "1.9.3.dev1": "9.3.0",
            "2.0.0": "10.0.0",
            "latest": "9.0.0",
            "1.8.1": "invalid",
        })
        self.assertEqual(rows, [
            {"version": "1.8.3", "kube": ["1.30"], "chart_version": "9.0.0",
             "requirements": [], "incompatibilities": []},
            {"version": "1.9.0", "kube": ["1.32"], "chart_version": "9.1.0",
             "requirements": [], "incompatibilities": []},
        ])

    def test_chart_crd_image_schema_does_not_crash_image_extraction(self):
        self.assertEqual(find_nested_images([
            {"properties": {"image": {"type": "string"}}},
            {"containers": [{"image": "openkruise/kruise-manager:v1.9.1"}]},
            {"image": None},
        ]), ["openkruise/kruise-manager:v1.9.1"])

    @patch.object(openkruise, "update_compatibility_info")
    @patch.object(openkruise, "get_chart_versions", return_value={"1.9.0": "1.9.0"})
    @patch.object(openkruise, "fetch_page")
    def test_scrape_hands_rows_to_existing_updater(self, fetch, charts, update):
        fetch.return_value = self.content
        openkruise.scrape()
        fetch.assert_called_once_with(openkruise.COMPATIBILITY_URL)
        charts.assert_called_once_with("openkruise")
        update.assert_called_once_with("../../static/compatibilities/openkruise.yaml", [
            {"version": "1.9.0", "kube": ["1.32"], "chart_version": "1.9.0",
             "requirements": [], "incompatibilities": []},
        ])

    @patch.object(openkruise, "print_error")
    @patch.object(openkruise, "update_compatibility_info")
    @patch.object(openkruise, "get_chart_versions", return_value={})
    @patch.object(openkruise, "fetch_page")
    def test_failed_sources_never_overwrite_existing_data(self, fetch, charts, update, error):
        for content in (None, b"", b"<html>Unavailable</html>", self.content):
            with self.subTest(content=content[:25] if content else content):
                fetch.return_value = content
                openkruise.scrape()
        update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
