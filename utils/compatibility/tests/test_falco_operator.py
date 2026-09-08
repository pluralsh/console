import importlib
import unittest
from unittest.mock import Mock, patch


scraper = importlib.import_module("scrapers.falco-operator")


def documentation(minimum="1.29"):
    return (
        "# Installation\n\n"
        "## Contents\nKubernetes 1.10+\n\n"
        "## Prerequisites\n\n"
        f"- **Kubernetes {minimum}+** — native sidecar support required.\n"
        "- **Helm 3.x** — only for Helm installation.\n\n"
        "## Install with Helm\nKubernetes 1.20+\n"
    )


class FalcoOperatorTests(unittest.TestCase):
    def test_reads_only_explicit_prerequisite(self):
        self.assertEqual(scraper.parse_minimum_kube_version(documentation()), "1.29")
        self.assertEqual(
            scraper.parse_minimum_kube_version(documentation().encode("utf-8")),
            "1.29",
        )

    def test_missing_ambiguous_or_changed_documentation_fails(self):
        for text in (
            None,
            "",
            "# Error\nKubernetes 1.29+",
            documentation().replace("## Prerequisites", "## Requirements"),
            documentation().replace("1.29+", "1.29–1.35"),
            documentation().replace(
                "- **Helm 3.x**", "- **Kubernetes 1.30+**\n- **Helm 3.x**"
            ),
            documentation() + "\n## Prerequisites\n- **Kubernetes 1.29+**\n",
        ):
            with self.subTest(text=text), self.assertRaises(ValueError):
                scraper.parse_minimum_kube_version(text)

    def test_version_expansion_has_no_off_by_one_or_future_minor(self):
        self.assertEqual(scraper.kube_versions_from_minimum("1.29", "1.29"), ["1.29"])
        self.assertEqual(
            scraper.kube_versions_from_minimum("1.29", "1.31"),
            ["1.29", "1.30", "1.31"],
        )
        self.assertEqual(scraper.kube_versions_from_minimum("1.37", "1.36"), [])

    def test_invalid_catalog_version_fails(self):
        for latest in (None, "", "1.36.0", "next", "2.0"):
            with self.subTest(latest=latest), self.assertRaises(ValueError):
                scraper.kube_versions_from_minimum("1.29", latest)

    def test_app_version_selects_docs_and_chart_version_stays_separate(self):
        fetch = Mock(side_effect=[documentation("1.30"), documentation("1.29")])
        rows = scraper.extract_table_data(
            {"0.3.0": "0.2.0", "0.4.1": "0.3.1"}, "1.31", fetch
        )
        self.assertEqual([r["version"] for r in rows], ["0.4.1", "0.3.0"])
        self.assertEqual([r["chart_version"] for r in rows], ["0.3.1", "0.2.0"])
        self.assertEqual(rows[0]["kube"], ["1.30", "1.31"])
        self.assertEqual(rows[1]["kube"], ["1.29", "1.30", "1.31"])
        self.assertEqual(
            [call.args[0] for call in fetch.call_args_list],
            [scraper.INSTALLATION_URL.format(version=v) for v in ("0.4.1", "0.3.0")],
        )

    def test_prerelease_and_malformed_versions_are_not_requested(self):
        fetch = Mock(return_value=documentation())
        rows = scraper.extract_table_data(
            {
                "0.5.0-rc1": "0.4.0-rc1",
                "0.4.2": "0.3.2-rc1",
                "0.4.1": "0.3.1",
                "0.4": "0.3.0",
                "../../main": "0.1.0",
                "0.3.0": None,
            },
            "1.36",
            fetch,
        )
        self.assertEqual([r["version"] for r in rows], ["0.4.1"])
        fetch.assert_called_once_with(scraper.INSTALLATION_URL.format(version="0.4.1"))

    def test_no_matching_stable_version_fails(self):
        with self.assertRaises(ValueError):
            scraper.extract_table_data({"0.5.0-rc1": "0.4.0-rc1"}, "1.36", Mock())

    def test_missing_later_document_does_not_write_partial_results(self):
        with (
            patch.object(scraper, "get_chart_versions", return_value={"0.4.1": "0.3.1", "0.3.0": "0.2.0"}),
            patch.object(scraper, "current_kube_version", return_value="1.36"),
            patch.object(scraper, "fetch_page", side_effect=[documentation(), None]),
            patch.object(scraper, "update_compatibility_info") as update,
            self.assertRaises(ValueError),
        ):
            scraper.scrape()
        update.assert_not_called()

    def test_scrape_uses_standard_update_pipeline(self):
        with (
            patch.object(scraper, "get_chart_versions", return_value={"0.4.1": "0.3.1"}) as charts,
            patch.object(scraper, "current_kube_version", return_value="1.36"),
            patch.object(scraper, "fetch_page", return_value=documentation()),
            patch.object(scraper, "update_compatibility_info") as update,
        ):
            scraper.scrape()
        charts.assert_called_once_with("falco-operator")
        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/falco-operator.yaml")
        self.assertEqual(rows[0]["kube"], [f"1.{n}" for n in range(29, 37)])
        self.assertEqual(rows[0]["requirements"], [])


if __name__ == "__main__":
    unittest.main()
