import importlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import requests


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.kgateway")


HEADER = (
    "| Kgateway | Release date | Kubernetes | Gateway API`*` | Envoy | Helm | Istio`†` |\n"
    "|----------|--------------|------------|----------------|-------|------|----------|\n"
)


def table(*rows):
    body = "".join(f"| {version} | 01 Jan 2026 | {kube} | 1.4 - 1.6 | Proxy 1.38, API v3 | >= 3.12 | 1.26 - 1.30 |\n"
                   for version, kube in rows)
    return "Review the following information.\n\n## Released versions\n\n" + HEADER + body + "\n## Release cadence\n"


class ParseVersionsTableTests(unittest.TestCase):
    def test_maps_each_release_family_to_its_kubernetes_minors(self):
        markdown = table(("2.4.x", "1.32 - 1.36"), ("2.3.x", "1.31 - 1.35"))
        self.assertEqual(scraper.parse_versions_table(markdown), {
            "2.4": ["1.36", "1.35", "1.34", "1.33", "1.32"],
            "2.3": ["1.35", "1.34", "1.33", "1.32", "1.31"],
        })

    def test_accepts_dash_variants_and_single_versions(self):
        markdown = table(("2.2.x", "1.31 – 1.33"), ("2.1.x", "1.31"))
        self.assertEqual(scraper.parse_versions_table(markdown), {
            "2.2": ["1.33", "1.32", "1.31"],
            "2.1": ["1.31"],
        })

    def test_rejects_missing_open_ended_duplicate_or_malformed_rows(self):
        invalid = [
            "",
            "no table here",
            HEADER.replace("Kubernetes", "Platform") + "| 2.4.x | 01 Jan 2026 | 1.32 - 1.36 | 1.4 | e | h | i |\n",
            table(("2.4.x", "1.32+")),
            table(("2.4.x", "1.32 - 1.36"), ("2.4.x", "1.31 - 1.35")),
            table(("2.4.x", "1.36 - 1.32")),
            table(("2.4.x", "unsupported")),
            table(("latest", "1.32 - 1.36")),
            table(("2.4.0", "1.32 - 1.36")),
        ]
        for markdown in invalid:
            with self.subTest(markdown=markdown), self.assertRaises(ValueError):
                scraper.parse_versions_table(markdown)


class FakeResponse:
    def __init__(self, payload, link=None):
        self.payload = payload
        self.headers = {"Link": link} if link else {}

    def json(self):
        return self.payload


class ChartTagsTests(unittest.TestCase):
    def test_keeps_stable_versions_and_prefers_v_prefixed_tags(self):
        tags = ["latest", "v2.4.0-rc.1", "v2.4.0-beta.1", "sha256-abc", "2.4.4", "v2.4.4", "v2.2.9", "2.3.0", "v2.0.5"]
        self.assertEqual(scraper.stable_chart_versions(tags), {
            "2.4.4": "v2.4.4", "2.2.9": "v2.2.9", "2.3.0": "2.3.0", "2.0.5": "v2.0.5",
        })

    def test_registry_listing_follows_pagination_after_anonymous_token(self):
        responses = [
            FakeResponse({"token": "abc"}),
            FakeResponse({"tags": ["v2.1.0", "v2.1.1"]}, link='</v2/kgateway-dev/charts/kgateway/tags/list?n=2&last=v2.1.1>; rel="next"'),
            FakeResponse({"tags": ["v2.2.0"]}),
        ]
        with patch.object(scraper, "get", side_effect=responses) as get:
            self.assertEqual(scraper.chart_tags(), ["v2.1.0", "v2.1.1", "v2.2.0"])
        self.assertEqual(get.call_args_list[0].args[0], scraper.TOKEN_URL)
        self.assertEqual(get.call_args_list[1].args[0], scraper.TAGS_URL)
        self.assertEqual(get.call_args_list[1].kwargs["headers"], {"Authorization": "Bearer abc"})
        self.assertEqual(get.call_args_list[2].args[0],
                         "https://ghcr.io/v2/kgateway-dev/charts/kgateway/tags/list?n=2&last=v2.1.1")

    def test_registry_listing_without_tags_fails(self):
        with patch.object(scraper, "get", side_effect=[FakeResponse({"token": "abc"}), FakeResponse({"tags": []})]):
            with self.assertRaisesRegex(ValueError, "no tags"):
                scraper.chart_tags()


class BuildRowsTests(unittest.TestCase):
    families = {"2.4": ["1.36", "1.35"], "2.3": ["1.35", "1.34"]}

    def test_emits_every_documented_stable_chart_release_newest_first(self):
        charts = {"2.3.0": "v2.3.0", "2.4.1": "v2.4.1", "2.4.0": "v2.4.0", "2.0.5": "v2.0.5"}
        self.assertEqual(scraper.build_rows(self.families, charts), [
            {"version": "2.4.1", "kube": ["1.36", "1.35"], "chart_version": "v2.4.1",
             "requirements": [], "incompatibilities": []},
            {"version": "2.4.0", "kube": ["1.36", "1.35"], "chart_version": "v2.4.0",
             "requirements": [], "incompatibilities": []},
            {"version": "2.3.0", "kube": ["1.35", "1.34"], "chart_version": "v2.3.0",
             "requirements": [], "incompatibilities": []},
        ])

    def test_documented_family_without_any_chart_is_skipped_but_nothing_matching_fails(self):
        rows = scraper.build_rows(self.families, {"2.4.0": "v2.4.0"})
        self.assertEqual([row["version"] for row in rows], ["2.4.0"])
        with self.assertRaisesRegex(ValueError, "No kgateway"):
            scraper.build_rows(self.families, {"2.0.5": "v2.0.5"})


class ScrapeTests(unittest.TestCase):
    def test_scrape_writes_rows_for_the_kgateway_table(self):
        markdown = table(("2.4.x", "1.32 - 1.36"))
        with patch.object(scraper, "fetch_text", return_value=markdown) as fetch_text,                 patch.object(scraper, "chart_tags", return_value=["v2.4.0", "v2.4.1-rc.1", "v2.3.8"]),                 patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        self.assertEqual(fetch_text.call_args.args[0], scraper.VERSIONS_URL)
        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/kgateway.yaml")
        self.assertEqual(rows, [
            {"version": "2.4.0", "kube": ["1.36", "1.35", "1.34", "1.33", "1.32"], "chart_version": "v2.4.0",
             "requirements": [], "incompatibilities": []},
        ])

    def test_source_failure_does_not_write_a_partial_table(self):
        for error in [ValueError("bad table"), requests.HTTPError("503")]:
            with self.subTest(error=error),                     patch.object(scraper, "fetch_text", side_effect=error),                     patch.object(scraper, "update_compatibility_info") as update:
                with self.assertRaises(type(error)):
                    scraper.scrape()
                update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
