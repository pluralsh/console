import importlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import requests
import yaml


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.volcano")

MATRIX = """## Kubernetes compatibility
| | Kubernetes 1.36 | Kubernetes 1.35 | Kubernetes 1.34 |
|---|---|---|---|
| Volcano HEAD (master) | ✓ | ✓ | ✓ |
| Volcano v1.15 | - | ✓ | ✓ |
| Volcano v1.14 | - | + | ✓ |

Key: ✓ is exact compatibility; + and - indicate feature/API differences.
## Other table
| unrelated | ignored |
"""


def index(entries):
    return yaml.safe_dump({"entries": {"volcano": entries}})


class VolcanoScraperTests(unittest.TestCase):
    def test_only_exact_compatibility_for_released_minors(self):
        self.assertEqual(scraper.parse_matrix(MATRIX), {
            "1.15": ["1.35", "1.34"], "1.14": ["1.34"],
        })

    def test_matrix_format_changes_fail(self):
        cases = [
            "", MATRIX + MATRIX,
            MATRIX.replace("Kubernetes 1.35", "Kubernetes 1.36"),
            MATRIX.replace("| - | + | ✓ |", "| - | + |"),
            MATRIX.replace("| - | + | ✓ |", "| - | + | maybe |"),
            MATRIX.replace("| - | + | ✓ |", "| - | + | - |"),
            MATRIX.replace("Volcano v1.14", "Volcano v1.15"),
            MATRIX.replace("Volcano v1.14", "Volcano v1.14.0-rc.1"),
            MATRIX.replace("Kubernetes 1.35", "Kubernetes 1.35+"),
            MATRIX.replace("|---|---|---|---|", "|---|---|"),
        ]
        for markdown in cases:
            with self.subTest(markdown=markdown), self.assertRaises(ValueError):
                scraper.parse_matrix(markdown)

    def test_chart_mapping_uses_app_version_and_semantic_chart_order(self):
        entries = [
            {"appVersion": "v1.15.2", "version": "2.9.0"},
            {"appVersion": "1.15.2", "version": "v2.10.0"},
            {"appVersion": "1.15.2", "version": "2.11.0-alpha.1"},
            {"appVersion": "1.16.0-alpha.1", "version": "1.16.0"},
            {"appVersion": "0.1", "version": "1.9.0"},
            {"version": "1.15.0"},
            {"appVersion": "1.14.4", "version": "1.14.4"},
        ]
        self.assertEqual(scraper.parse_chart_versions(index(entries)), {
            "1.15.2": "v2.10.0", "1.14.4": "1.14.4",
        })

    def test_empty_or_invalid_chart_index_fails(self):
        for source in ["null", "[]", "entries: []", index([]), index([None]),
                       index([{"appVersion": "0.1", "version": "1.9.0"}])]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                scraper.parse_chart_versions(source)

    def test_does_not_infer_undocumented_or_unpublished_releases(self):
        versions = scraper.build_versions(scraper.parse_matrix(MATRIX), {
            "1.16.0": "1.16.0", "1.15.2": "1.15.2", "1.15.0": "1.15.0", "1.9.0": "1.9.0",
        })
        self.assertEqual([row["version"] for row in versions], ["1.15.2", "1.15.0"])
        self.assertTrue(all(row["kube"] == ["1.35", "1.34"] for row in versions))
        with self.assertRaises(ValueError):
            scraper.build_versions(scraper.parse_matrix(MATRIX), {"1.9.0": "1.9.0"})

    def test_scrape_updates_only_after_both_sources_validate(self):
        charts = index([{"appVersion": "1.15.2", "version": "1.15.2"}]).encode()
        with patch.object(scraper, "fetch", side_effect=[MATRIX.encode(), charts]) as fetch, \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        self.assertEqual([call.args[0] for call in fetch.call_args_list],
                         [scraper.MATRIX_URL, scraper.CHART_INDEX_URL])
        path, versions = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/volcano.yaml")
        self.assertEqual(versions, [{
            "version": "1.15.2", "kube": ["1.35", "1.34"], "chart_version": "1.15.2",
            "requirements": [], "incompatibilities": [],
        }])

    def test_failed_sources_never_write_partial_data(self):
        cases = [[requests.HTTPError("503")], [MATRIX.encode(), requests.Timeout()],
                 [MATRIX.encode(), b"entries: {}"], [b"bad source"]]
        for responses in cases:
            with self.subTest(responses=responses), \
                    patch.object(scraper, "fetch", side_effect=responses), \
                    patch.object(scraper, "update_compatibility_info") as update:
                with self.assertRaises((ValueError, requests.RequestException)):
                    scraper.scrape()
                update.assert_not_called()

    def test_http_errors_and_timeout_are_not_hidden(self):
        with patch.object(scraper.requests, "get") as get:
            get.return_value.raise_for_status.side_effect = requests.HTTPError("503")
            with self.assertRaises(requests.HTTPError):
                scraper.fetch(scraper.MATRIX_URL)
            get.assert_called_once_with(scraper.MATRIX_URL, timeout=30)


if __name__ == "__main__":
    unittest.main()
