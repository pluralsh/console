import importlib.util
from pathlib import Path
from types import ModuleType
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location(
    "antrea", Path(__file__).parents[1] / "scrapers" / "antrea.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def readme(minimum):
    return (
        "# Antrea\n\n## Prerequisites\n\n"
        f"Antrea has been tested with Kubernetes clusters running version 1.{minimum} or later.\n"
        "\n## Getting Started\nOther requirements follow.\n"
    ).encode("utf-8")


class AntreaTests(unittest.TestCase):
    def test_each_app_uses_its_tag_not_chart_or_main(self):
        pages = {
            scraper.README_URL.format(version="1.15.2"): readme(16),
            scraper.README_URL.format(version="2.0.0"): readme(19),
            scraper.README_URL.format(version="2.7.0"): readme(23),
        }
        fetch = Mock(side_effect=pages.__getitem__)
        rows = scraper.build_rows(
            {"1.15.2": "9.0.0", "2.0.0": "9.1.0", "2.7.0": "9.2.0"}, "1.24", fetch
        )
        self.assertEqual([r["version"] for r in rows], ["2.7.0", "2.0.0", "1.15.2"])
        self.assertEqual([r["chart_version"] for r in rows], ["9.2.0", "9.1.0", "9.0.0"])
        self.assertEqual(rows[0]["kube"], ["1.24", "1.23"])
        self.assertEqual(rows[1]["kube"][-1], "1.19")
        self.assertEqual(rows[2]["kube"][-1], "1.16")
        self.assertEqual(fetch.call_count, 3)

    def test_skips_prereleases_and_pre_helm_versions(self):
        fetch = Mock(return_value=readme(16))
        rows = scraper.build_rows({
            "1.7.3": "1.7.3", "2.2.0-alpha.1": "2.2.0-alpha.1",
            "main": "9.0.0", "2.0.0": "2.0.0-beta.1", "1.8.0": "1.8.0",
        }, "1.16", fetch)
        self.assertEqual([r["version"] for r in rows], ["1.8.0"])
        self.assertEqual(rows[0]["kube"], ["1.16"])
        fetch.assert_called_once_with(scraper.README_URL.format(version="1.8.0"))

    def test_patch_releases_can_change_the_minimum(self):
        fetch = Mock(side_effect=[readme(19), readme(23)])
        rows = scraper.build_rows({"2.1.0": "2.1.0", "2.1.1": "2.1.1"}, "1.24", fetch)
        self.assertEqual([r["version"] for r in rows], ["2.1.1", "2.1.0"])
        self.assertEqual([r["kube"][-1] for r in rows], ["1.23", "1.19"])

    def test_rejects_missing_ambiguous_or_out_of_section_minimum(self):
        sentence = readme(23).decode().splitlines()[4]
        for text in ["no prerequisites", "## Prerequisites\nNo numeric policy.\n",
                     "## Prerequisites\n\n## Elsewhere\n" + sentence,
                     "## Prerequisites\n" + sentence + "\n" + sentence]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                scraper.parse_minimum(text)

    def test_rejects_empty_sources_and_invalid_bounds(self):
        for page in [None, b"", b"bad document", b"\xff"]:
            with self.subTest(page=page), self.assertRaises(ValueError):
                scraper.build_rows({"2.7.0": "2.7.0"}, "1.24", Mock(return_value=page))
        for ceiling in ["2.0", "1.24.1", "1.22"]:
            with self.subTest(ceiling=ceiling), self.assertRaises(ValueError):
                scraper.build_rows({"2.7.0": "2.7.0"}, ceiling, Mock(return_value=readme(23)))
        with self.assertRaises(ValueError):
            scraper.build_rows({}, "1.24", Mock())

    def test_scrape_wiring_and_no_partial_update(self):
        helpers = ModuleType("utils")
        helpers.get_chart_versions = Mock(return_value={"1.15.2": "1.15.2", "2.7.0": "2.7.0"})
        helpers.current_kube_version = Mock(return_value="1.24")
        helpers.fetch_page = Mock(side_effect=[readme(16), None])
        helpers.update_compatibility_info = Mock()
        with patch.dict("sys.modules", {"utils": helpers}), self.assertRaises(ValueError):
            scraper.scrape()
        helpers.update_compatibility_info.assert_not_called()
        helpers.fetch_page = Mock(side_effect=[readme(16), readme(23)])
        with patch.dict("sys.modules", {"utils": helpers}):
            scraper.scrape()
        helpers.get_chart_versions.assert_called_with("antrea")
        path, rows = helpers.update_compatibility_info.call_args.args
        self.assertEqual(path, "../../static/compatibilities/antrea.yaml")
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["version"], "2.7.0")
        self.assertEqual(rows[0]["kube"], ["1.24", "1.23"])


if __name__ == "__main__":
    unittest.main()
