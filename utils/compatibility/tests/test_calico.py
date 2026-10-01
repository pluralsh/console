"""Offline coverage for Calico's version-specific Kubernetes requirements."""

import importlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.calico")


def requirements_page(family, versions):
    values = " ".join(f"v{version}" for version in versions)
    return (
        "<html><body><h4>Supported versions</h4>"
        f"<p>We test Calico v{family} against the following Kubernetes versions. "
        f"{values} Due to changes in the Kubernetes API, Calico v{family} will not work "
        "on Kubernetes v1.20 or below.</p></body></html>"
    ).encode()


class CalicoTests(unittest.TestCase):
    def test_parser_uses_the_release_family_and_sorts_versions(self):
        page = requirements_page("3.32", ["1.34", "1.36", "1.35", "1.35"])
        self.assertEqual(
            scraper.parse_kube_versions(page, "3.32"),
            ["1.36", "1.35", "1.34"],
        )

    def test_parser_rejects_missing_or_malformed_source(self):
        for page in (
            b"<p>Supported versions: 1.34, 1.35</p>",
            requirements_page("3.31", ["1.34"]).replace(
                b"Due to changes in the Kubernetes API", b"Source changed"
            ),
            requirements_page("3.32", []),
        ):
            with self.subTest(page=page):
                with self.assertRaises(ValueError):
                    scraper.parse_kube_versions(page, "3.32")

    def test_scrape_fetches_each_family_once_and_builds_rows(self):
        releases = ["v3.32.2", "v3.31.7", "v3.32.1"]
        charts = {version.lstrip("v"): version.lstrip("v") for version in releases}
        pages = {
            scraper.compatibility_url.format(version="3.32"): requirements_page(
                "3.32", ["1.34", "1.35", "1.36"]
            ),
            scraper.compatibility_url.format(version="3.31"): requirements_page(
                "3.31", ["1.32", "1.33", "1.34", "1.35"]
            ),
        }

        with patch.object(
            scraper, "get_github_releases", return_value=releases
        ), patch.object(
            scraper, "get_chart_versions", return_value=charts
        ), patch.object(
            scraper, "fetch_page", side_effect=pages.get
        ) as fetch, patch.object(
            scraper, "update_compatibility_info"
        ) as update:
            scraper.do_scrape("calico")

        self.assertEqual(fetch.call_count, 2)
        self.assertEqual(
            [call.args[0] for call in fetch.call_args_list],
            list(pages),
        )
        rows = update.call_args.args[1]
        self.assertEqual(
            [row["version"] for row in rows], ["3.32.2", "3.31.7", "3.32.1"]
        )
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34"])
        self.assertEqual(rows[1]["kube"], ["1.35", "1.34", "1.33", "1.32"])

    def test_source_failure_does_not_write_partial_compatibility_data(self):
        with patch.object(
            scraper, "get_github_releases", return_value=["v3.32.2"]
        ), patch.object(
            scraper, "get_chart_versions", return_value={"3.32.2": "3.32.2"}
        ), patch.object(
            scraper, "fetch_page", return_value=None
        ), patch.object(
            scraper, "update_compatibility_info"
        ) as update:
            scraper.do_scrape("calico")

        update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
