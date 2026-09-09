import importlib.util
import json
import os
from pathlib import Path
import runpy
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

import yaml


SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "piraeus-operator.py"
spec = importlib.util.spec_from_file_location("piraeus_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

RELEASES = json.dumps(
    [
        {"tag_name": "v2.11.0", "draft": False, "prerelease": False},
        {"tag_name": "v2.11.0-rc.1", "draft": False, "prerelease": True},
        {"tag_name": "v2.10.8", "draft": False, "prerelease": False},
        {"tag_name": "v2.10.7", "draft": False, "prerelease": False},
        {"tag_name": "v2.0.1", "draft": False, "prerelease": False},
        {"tag_name": "v1.10.9", "draft": False, "prerelease": False},
        {"tag_name": "nonsense", "draft": False, "prerelease": False},
        {"tag_name": "v9.0.0", "draft": True, "prerelease": False},
    ]
)
README_120 = (
    "![Kubernetes](https://img.shields.io/badge/"
    "Kubernetes-v1.20%2B-success?logo=kubernetes)"
)
README_119 = "![Kubernetes](https://img.shields.io/badge/Kubernetes-v1.19+-green)"


def chart(version):
    return f'''apiVersion: v2
name: piraeus
version: {version}
appVersion: "v{version}"
'''


class PiraeusOperatorTests(unittest.TestCase):
    def test_scrape_updates_once_with_releases_from_every_page(self):
        first = [{"tag_name": f"v2.11.{number}"} for number in range(100)]
        second = [{"tag_name": "v2.0.1"}, {"tag_name": "v2.11.100"},
                  {"tag_name": "v2.12.0-rc.1", "prerelease": True}]
        sources = {
            f"{scraper.RELEASES_URL}?per_page=100&page=1": json.dumps(first),
            f"{scraper.RELEASES_URL}?per_page=100&page=2": json.dumps(second),
        }
        for version in ("2.11.100", "2.0.1"):
            sources[scraper.README_URL.format(version=version)] = README_120
            sources[scraper.CHART_URL.format(version=version)] = chart(version)
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(side_effect=sources.__getitem__)
        helpers.current_kube_version = Mock(return_value="1.22")
        helpers.update_compatibility_info = Mock()
        with patch.dict(sys.modules, {"utils": helpers}):
            scraper.scrape()
        helpers.update_compatibility_info.assert_called_once()
        path, rows = helpers.update_compatibility_info.call_args.args
        self.assertEqual(path, "../../static/compatibilities/piraeus-operator.yaml")
        self.assertEqual([row["version"] for row in rows], ["2.11.100", "2.0.1"])
        self.assertEqual([call.args[0] for call in helpers.fetch_page.call_args_list],
                         list(sources))

    def test_full_last_page_requires_empty_terminating_page(self):
        page = json.dumps([{"tag_name": f"v2.11.{number}"} for number in range(100)])
        fetcher = Mock(side_effect=[page, "[]"])
        self.assertEqual(scraper.stable_versions(scraper.fetch_releases(fetcher)),
                         ["2.11.99"])
        self.assertEqual([call.args[0] for call in fetcher.call_args_list], [
            f"{scraper.RELEASES_URL}?per_page=100&page=1",
            f"{scraper.RELEASES_URL}?per_page=100&page=2",
        ])

    def test_bad_later_page_aborts_without_partial_update(self):
        first = json.dumps([{"tag_name": f"v2.11.{number}"} for number in range(100)])
        for later in (None, "", "not json", "{}", "[null]", first):
            with self.subTest(later=later):
                helpers = ModuleType("utils")
                helpers.fetch_page = Mock(side_effect=[first, later])
                helpers.current_kube_version = Mock(return_value="1.22")
                helpers.update_compatibility_info = Mock()
                with patch.dict(sys.modules, {"utils": helpers}):
                    with self.assertRaises(ValueError):
                        scraper.scrape()
                helpers.update_compatibility_info.assert_not_called()
                self.assertEqual(helpers.fetch_page.call_count, 2)

    def test_main_dispatches_registered_scraper_and_aggregates_result(self):
        root = SCRAPER_PATH.parents[3]
        compatibility = SCRAPER_PATH.parents[1]
        updated = {}

        def read_yaml(path):
            if path in updated:
                return updated[path]
            return yaml.safe_load((compatibility / path).read_text())

        def update(path, rows):
            addon = read_yaml(path)
            addon["versions"] = rows
            updated[path] = addon

        sources = {
            f"{scraper.RELEASES_URL}?per_page=100&page=1": json.dumps([
                {"tag_name": "v2.11.0", "draft": False, "prerelease": False}
            ]).encode(),
            scraper.README_URL.format(version="2.11.0"): README_120.encode(),
            scraper.CHART_URL.format(version="2.11.0"): chart("2.11.0").encode(),
        }
        helpers = ModuleType("utils")
        helpers.read_yaml = read_yaml
        helpers.write_yaml = Mock()
        helpers.print_error = Mock()
        helpers.print_warning = Mock()
        helpers.latest_kube_version = Mock()
        helpers.current_kube_version = Mock(return_value="1.22")
        helpers.fetch_page = Mock(side_effect=sources.__getitem__)
        helpers.update_compatibility_info = Mock(side_effect=update)
        helpers.enrich_addon_with_eol = Mock()
        kube_versions = ModuleType("kube_versions")
        kube_versions.generate_kube_changelog = Mock()

        with patch.dict(sys.modules, {"utils": helpers, "kube_versions": kube_versions}), \
                patch.object(sys, "path", [str(compatibility), *sys.path]), \
                patch.dict(os.environ, {"SCRAPER": "piraeus-operator"}), \
                patch("os.path.exists", return_value=True), patch("time.sleep"):
            runpy.run_path(str(compatibility / "main.py"), run_name="__main__")

        helpers.print_error.assert_not_called()
        helpers.print_warning.assert_not_called()
        helpers.update_compatibility_info.assert_called_once()
        self.assertEqual(helpers.fetch_page.call_count, 3)
        aggregate = next(call.args[1] for call in helpers.write_yaml.call_args_list
                         if call.args[0] == "../../static/compatibilities.yaml")
        names = read_yaml("../../static/compatibilities/manifest.yaml")["names"]
        self.assertEqual([addon["name"] for addon in aggregate["addons"]], names)
        piraeus = next(addon for addon in aggregate["addons"]
                       if addon["name"] == "piraeus-operator")
        self.assertEqual(piraeus["versions"][0]["kube"], ["1.22", "1.21", "1.20"])
        self.assertEqual(len(piraeus["versions"]), 1)
        self.assertEqual(piraeus, updated["../../static/compatibilities/piraeus-operator.yaml"])
        for addon in aggregate["addons"]:
            if addon["name"] != "piraeus-operator":
                expected = read_yaml(f"../../static/compatibilities/{addon['name']}.yaml")
                expected["name"] = addon["name"]
                self.assertEqual(addon, expected)

        # The checked-in consumer artifact must expose the same per-app data.
        committed = yaml.safe_load((root / "static/compatibilities.yaml").read_text())
        entries = [addon for addon in committed["addons"]
                   if addon["name"] == "piraeus-operator"]
        expected = yaml.safe_load((root / "static/compatibilities/piraeus-operator.yaml").read_text())
        self.assertEqual(entries, [expected])

    def test_selects_latest_stable_patch_per_supported_minor(self):
        self.assertEqual(
            scraper.stable_versions(RELEASES),
            ["2.11.0", "2.10.8", "2.0.1"],
        )

    def test_rejects_unexpected_release_shape(self):
        with self.assertRaisesRegex(ValueError, "Unexpected Piraeus releases"):
            scraper.stable_versions("{}")

    def test_parses_tagged_minimum_kubernetes_badge(self):
        self.assertEqual(scraper.parse_min_kubernetes(README_120), "1.20")
        self.assertEqual(scraper.parse_min_kubernetes(README_119), "1.19")

    def test_missing_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "minimum Kubernetes version"):
            scraper.parse_min_kubernetes("# Piraeus Operator")

    def test_validates_chart_release_provenance(self):
        self.assertEqual(scraper.parse_chart_metadata(chart("2.11.0"), "2.11.0"), "2.11.0")
        with self.assertRaisesRegex(ValueError, "does not match release"):
            scraper.parse_chart_metadata(chart("2.10.8"), "2.11.0")

    def test_expands_declared_minimum_to_plural_ceiling(self):
        self.assertEqual(
            scraper.expand_minimum("1.20", "1.23"),
            ["1.23", "1.22", "1.21", "1.20"],
        )

    def test_future_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "newer than Plural"):
            scraper.expand_minimum("1.30", "1.29")

    def test_build_rows_uses_versioned_readme_and_chart(self):
        payload = json.dumps(
            [{"tag_name": "v2.11.0", "draft": False, "prerelease": False}]
        )
        sources = {
            scraper.README_URL.format(version="2.11.0"): README_120.encode(),
            scraper.CHART_URL.format(version="2.11.0"): chart("2.11.0").encode(),
        }
        rows = scraper.build_rows(payload, "1.22", sources.get)
        self.assertEqual(rows[0]["version"], "2.11.0")
        self.assertEqual(rows[0]["chart_version"], "2.11.0")
        self.assertEqual(rows[0]["kube"], ["1.22", "1.21", "1.20"])

    def test_missing_tagged_source_fails_closed(self):
        payload = json.dumps(
            [{"tag_name": "v2.11.0", "draft": False, "prerelease": False}]
        )
        with self.assertRaisesRegex(ValueError, "Missing tagged Piraeus sources"):
            scraper.build_rows(payload, "1.22", lambda _: None)

    def test_scrape_wires_official_sources_and_output(self):
        payload = json.dumps(
            [{"tag_name": "v2.11.0", "draft": False, "prerelease": False}]
        ).encode()
        helpers = ModuleType("utils")
        helpers.current_kube_version = Mock(return_value="1.22")
        helpers.fetch_page = Mock(
            side_effect=lambda url: (
                payload
                if url.startswith(scraper.RELEASES_URL)
                else README_120.encode()
                if url == scraper.README_URL.format(version="2.11.0")
                else chart("2.11.0").encode()
            )
        )
        helpers.update_compatibility_info = Mock()

        previous = sys.modules.get("utils")
        try:
            with patch.dict(sys.modules, {"utils": helpers}):
                scraper.scrape()
        finally:
            if previous is None:
                sys.modules.pop("utils", None)
            else:
                sys.modules["utils"] = previous

        path, rows = helpers.update_compatibility_info.call_args.args
        self.assertEqual(path, "../../static/compatibilities/piraeus-operator.yaml")
        self.assertEqual(rows[0]["version"], "2.11.0")


if __name__ == "__main__":
    unittest.main()
