import importlib.util
from pathlib import Path
from types import ModuleType
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location(
    "metallb", Path(__file__).parents[1] / "scrapers" / "metallb.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def entry(app="v0.14.2", chart="0.14.2", constraint=">= 1.19.0-0"):
    return {"appVersion": app, "version": chart, "kubeVersion": constraint}


def index(*entries):
    return {"entries": {"metallb": list(entries)}}


class MetalLBTests(unittest.TestCase):
    def test_uses_each_chart_constraint_and_app_version(self):
        rows = scraper.build_rows(index(
            entry(), entry("v0.15.0", "0.15.1", ">= 1.21.0"),
        ), "1.22")
        self.assertEqual([row["version"] for row in rows], ["0.15.0", "0.14.2"])
        self.assertEqual(rows[0]["chart_version"], "0.15.1")
        self.assertEqual(rows[0]["kube"], ["1.22", "1.21"])
        self.assertEqual(rows[1]["kube"], ["1.22", "1.21", "1.20", "1.19"])

    def test_filters_old_prerelease_and_development_charts(self):
        rows = scraper.build_rows(index(
            entry("v0.13.7", "0.13.7", None),
            entry("v0.14.1", "0.0.0"),
            entry("v0.17.0-rc.1", "0.17.0"),
            entry("v0.17.0", "0.17.0-rc.1"), entry(),
        ), "1.19")
        self.assertEqual([row["version"] for row in rows], ["0.14.2"])

    def test_chooses_highest_chart_for_an_app_independent_of_order(self):
        entries = [entry(chart="0.14.9"), entry(chart="0.14.10", constraint=">= 1.20.0")]
        a = scraper.build_rows(index(*entries), "1.21")
        self.assertEqual(a, scraper.build_rows(index(*reversed(entries)), "1.21"))
        self.assertEqual(a[0]["chart_version"], "0.14.10")
        self.assertEqual(a[0]["kube"], ["1.21", "1.20"])
        with self.assertRaises(ValueError):
            scraper.build_rows(index(entry(), entry(constraint=">= 1.20.0")), "1.21")

    def test_rejects_unsupported_constraints_instead_of_widening(self):
        for value in [None, "", ">=1.19.1", ">=1.19.0 <1.25.0", "^1.19.0", ">=2.0.0"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                scraper.build_rows(index(entry(constraint=value)), "1.36")

    def test_rejects_missing_data_and_invalid_bounds(self):
        for data in [None, {}, {"entries": []}, index(), index(None)]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                scraper.build_rows(data, "1.36")
        for bound in ["1.18", "1.19.0", "2.0"]:
            with self.subTest(bound=bound), self.assertRaises(ValueError):
                scraper.build_rows(index(entry()), bound)

    def test_scrape_updates_once_and_never_writes_partial_rows(self):
        utilities = ModuleType("utils")
        utilities.current_kube_version = Mock(return_value="1.20")
        utilities.fetch_page = Mock(return_value=scraper.yaml.safe_dump(index(entry())))
        utilities.update_compatibility_info = Mock()
        with patch.dict("sys.modules", {"utils": utilities}):
            scraper.scrape()
            utilities.fetch_page.assert_called_once_with(scraper.INDEX_URL)
            utilities.update_compatibility_info.assert_called_once_with(
                "../../static/compatibilities/metallb.yaml",
                scraper.build_rows(index(entry()), "1.20"),
            )
            for page in [None, b"", b"entries: [", scraper.yaml.safe_dump(index(
                entry(), entry("v0.15.0", "0.15.0", None),
            ))]:
                utilities.fetch_page.return_value = page
                utilities.update_compatibility_info.reset_mock()
                with self.assertRaises((ValueError, scraper.yaml.YAMLError)):
                    scraper.scrape()
                utilities.update_compatibility_info.assert_not_called()


if __name__ == "__main__":
    unittest.main()
