"""Offline regressions for the Secrets Store CSI Driver compatibility scraper."""

import importlib
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

import yaml


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.secrets-store-csi-driver")


def index(entries):
    return yaml.safe_dump({"entries": {scraper.APP_NAME: entries}}).encode()


class SecretsStoreCSIDriverScraperTests(unittest.TestCase):
    def test_kube_constraint_lower_bounds_expand_to_current_minor(self):
        self.assertEqual(
            scraper.kube_versions_from_constraint(">=1.30.0-0", "1.36"),
            ["1.30", "1.31", "1.32", "1.33", "1.34", "1.35", "1.36"],
        )
        self.assertEqual(
            scraper.kube_versions_from_constraint(">=1.16.0-0", "1.18"),
            ["1.16", "1.17", "1.18"],
        )

    def test_kube_constraint_with_upper_bound(self):
        self.assertEqual(
            scraper.kube_versions_from_constraint(">=1.26.0-0 <1.29.0-0", "1.36"),
            ["1.26", "1.27", "1.28"],
        )
        self.assertEqual(
            scraper.kube_versions_from_constraint(">=1.26.0-0 <=1.29.0", "1.36"),
            ["1.26", "1.27", "1.28", "1.29"],
        )

    def test_strict_patch_bounds_keep_partially_compatible_minors(self):
        self.assertEqual(
            scraper.kube_versions_from_constraint(">1.30.0", "1.36"),
            ["1.30", "1.31", "1.32", "1.33", "1.34", "1.35", "1.36"],
        )
        self.assertEqual(
            scraper.kube_versions_from_constraint(">=1.26.0-0 <1.29.5", "1.36"),
            ["1.26", "1.27", "1.28", "1.29"],
        )
        self.assertEqual(
            scraper.kube_versions_from_constraint(">=1.26.0-0 <1.29.0", "1.36"),
            ["1.26", "1.27", "1.28"],
        )

    def test_unsupported_constraints_fail_closed(self):
        for constraint in ("", "1.30+", "<1.30.0", "not-a-version"):
            with self.subTest(constraint=constraint):
                with self.assertRaises(ValueError):
                    scraper.kube_versions_from_constraint(constraint, "1.36")

    def test_build_rows_keeps_newest_patch_per_minor_and_kube_boundary(self):
        rows = scraper.build_rows(
            index(
                [
                    {"version": "1.6.0", "appVersion": "1.6.0", "kubeVersion": ">=1.30.0-0"},
                    {"version": "1.5.6", "appVersion": "1.5.6", "kubeVersion": ">=1.16.0-0"},
                    {"version": "1.5.5", "appVersion": "1.5.5", "kubeVersion": ">=1.16.0-0"},
                    {"version": "0.0.23", "appVersion": "0.0.23", "kubeVersion": ">=1.16.0-0"},
                    {"version": "0.0.13", "appVersion": "0.0.13", "kubeVersion": ">=1.15.0-0"},
                    {
                        "version": "1.7.0-rc.1",
                        "appVersion": "1.7.0-rc.1",
                        "kubeVersion": ">=1.31.0-0",
                    },
                ]
            ),
            "1.36",
        )

        self.assertEqual(
            [(row["version"], row["chart_version"]) for row in rows],
            [
                ("1.6.0", "1.6.0"),
                ("1.5.6", "1.5.6"),
                ("0.0.23", "0.0.23"),
                ("0.0.13", "0.0.13"),
            ],
        )
        self.assertEqual(
            rows[0]["kube"],
            ["1.30", "1.31", "1.32", "1.33", "1.34", "1.35", "1.36"],
        )
        self.assertEqual(
            rows[-1]["kube"],
            [
                "1.15",
                "1.16",
                "1.17",
                "1.18",
                "1.19",
                "1.20",
                "1.21",
                "1.22",
                "1.23",
                "1.24",
                "1.25",
                "1.26",
                "1.27",
                "1.28",
                "1.29",
                "1.30",
                "1.31",
                "1.32",
                "1.33",
                "1.34",
                "1.35",
                "1.36",
            ],
        )

    def test_missing_chart_entries_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "chart entries not found"):
            scraper.build_rows(yaml.safe_dump({"entries": {}}).encode(), "1.36")

    def test_bad_index_payload_fails_closed(self):
        for payload in (b"[]", b"entries:\n  secrets-store-csi-driver: not-a-list"):
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    scraper.build_rows(payload, "1.36")

    def test_scrape_wires_official_index_and_target_file(self):
        payload = index(
            [
                {"version": "1.6.0", "appVersion": "1.6.0", "kubeVersion": ">=1.30.0-0"},
            ]
        )
        with patch.object(scraper, "fetch_page", Mock(return_value=payload)) as fetch, \
                patch.object(scraper, "current_kube_version", Mock(return_value="1.36")), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()

        fetch.assert_called_once_with(scraper.HELM_INDEX_URL)
        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/secrets-store-csi-driver.yaml")
        self.assertEqual(rows[0]["version"], "1.6.0")
        self.assertEqual(rows[0]["chart_version"], "1.6.0")

    def test_scrape_source_failure_does_not_write(self):
        with patch.object(scraper, "fetch_page", Mock(return_value=None)), \
                patch.object(scraper, "update_compatibility_info") as update, \
                patch.object(scraper, "print_error"):
            scraper.scrape()
        update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
