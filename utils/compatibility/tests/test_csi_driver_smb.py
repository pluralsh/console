"""Offline regressions for the actual SMB scraper, with complete pinned upstream sources.

The four shared Plural adapters are mocked in scrape() tests; the actual parser,
YAML loader, range expansion and version pairing execute. These tests do not
run Helm, deploy Kubernetes, or prove maintainer acceptance.
"""
from __future__ import annotations

import copy
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import Mock, patch

import yaml

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("csi_driver_smb", ROOT / "scrapers/csi-driver-smb.py")
SMB = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SMB)
FIXTURES = Path(__file__).parent / "fixtures/csi-driver-smb"
SOURCE_MD = (FIXTURES / "compatibility.md").read_text(encoding="utf-8")
SOURCE_INDEX_TEXT = (FIXTURES / "index.yaml").read_text(encoding="utf-8")
SOURCE_INDEX = yaml.safe_load(SOURCE_INDEX_TEXT)


def table(rows: str) -> str:
    return "| Driver Version | Supported K8s Version |\n| --- | --- |\n" + rows + "\n"


def chart(app="1.20.3", version="1.20.3", **fields):
    return dict(name=SMB.APP_NAME, appVersion=app, version=version, **fields)


def index(*entries):
    return {"entries": {SMB.APP_NAME: list(entries)}}


class SMBParserTests(unittest.TestCase):
    def test_full_source_has_only_three_stable_releases(self):
        self.assertEqual(SMB.parse_compatibility_table(SOURCE_MD),
                         {"1.20.3": "1.21+", "1.19.1": "1.21+", "1.18.0": "1.21+"})

    def test_documented_pairs_not_undocumented_helm_releases(self):
        rows = SMB.extract_versions(SOURCE_MD, SOURCE_INDEX, "1.36")
        self.assertEqual([r["version"] for r in rows], ["1.20.3", "1.19.1", "1.18.0"])
        expected_kube = [f"1.{n}" for n in range(36, 20, -1)]
        for row in rows:
            self.assertEqual(row["chart_version"], row["version"])
            self.assertEqual(row["kube"], expected_kube)
            self.assertNotIn("images", row)  # do not invent rendered images

    def test_generation_does_not_mutate_input(self):
        source = copy.deepcopy(SOURCE_INDEX)
        before = copy.deepcopy(source)
        first = SMB.extract_versions(SOURCE_MD, source, "1.36")
        second = SMB.extract_versions(SOURCE_MD, source, "1.36")
        self.assertEqual(first, second)
        self.assertEqual(source, before)

    def test_equal_bounds_add_no_extra_minor(self):
        self.assertEqual(SMB.expand_declared_minimum("1.36+", "1.36"), ["1.36"])

    def test_numeric_not_lexicographic_minor_order(self):
        self.assertEqual(SMB.expand_declared_minimum("1.9+", "1.11"), ["1.11", "1.10", "1.9"])

    def test_reversed_bounds_fail(self):
        with self.assertRaises(SMB.SourceError):
            SMB.expand_declared_minimum("1.37+", "1.36")

    def test_unknown_constraints_fail(self):
        for spec in ["1.21", ">=1.21", "1.21.1+", "1.21 - 1.36", "1.021+", "any", None, 1]:
            with self.subTest(spec=spec), self.assertRaises(SMB.SourceError):
                SMB.expand_declared_minimum(spec, "1.36")

    def test_unknown_ceilings_fail(self):
        for ceiling in [None, "2.0", "1.36.1", "1.9999", " 1.36", True]:
            with self.subTest(ceiling=ceiling), self.assertRaises(SMB.SourceError):
                SMB.expand_declared_minimum("1.21+", ceiling)

    def test_prerelease_build_and_development_rows_are_omitted(self):
        text = table("| HEAD | 1.21+ |\n| main branch | 1.21+ |\n| v1.21.0-rc.1 | 1.21+ |\n"
                     "| v1.21.0+build.1 | 1.21+ |\n| v1.20.3 | 1.21+ |")
        self.assertEqual(SMB.parse_compatibility_table(text), {"1.20.3": "1.21+"})

    def test_bad_driver_label_not_silently_skipped(self):
        with self.assertRaises(SMB.SourceError):
            SMB.parse_compatibility_table(table("| stable | 1.21+ |"))

    def test_missing_or_duplicate_table_fails(self):
        for value in ["no table", SOURCE_MD + SOURCE_MD, 4, ""]:
            with self.subTest(value=type(value)), self.assertRaises(SMB.SourceError):
                SMB.parse_compatibility_table(value)

    def test_reordered_columns_work(self):
        text = "| Supported K8s Version | Driver Version |\n| --- | --- |\n| 1.21+ | v1.20.3 |\n"
        self.assertEqual(SMB.parse_compatibility_table(text), {"1.20.3": "1.21+"})

    def test_bad_separator_and_short_rows_fail(self):
        texts = [table("| v1.20.3 |"), table("| v1.20.3 | 1.21+"),
                 table("| v1.20.3 | 1.21+ |").replace("| --- | --- |", "| -- | --- |")]
        for text in texts:
            with self.subTest(text=text), self.assertRaises(SMB.SourceError):
                SMB.parse_compatibility_table(text)

    def test_conflicting_duplicate_release_fails(self):
        with self.assertRaises(SMB.SourceError):
            SMB.parse_compatibility_table(table("| v1.20.3 | 1.21+ |\n| 1.20.3 | 1.22+ |"))

    def test_identical_duplicate_collapses(self):
        self.assertEqual(SMB.parse_compatibility_table(table(
            "| v1.20.3 | 1.21+ |\n| 1.20.3 | 1.21+ |")), {"1.20.3": "1.21+"})

    def test_table_boundary_excludes_unrelated_section(self):
        text = table("| v1.20.3 | 1.21+ |") + "\n## Other\n| v9.9.9 | 1.21+ |\n"
        self.assertEqual(SMB.parse_compatibility_table(text), {"1.20.3": "1.21+"})

    def test_legacy_chart_v_prefix_is_preserved(self):
        rows = SMB.extract_versions(table("| v1.17.0 | 1.21+ |"), SOURCE_INDEX, "1.36")
        self.assertEqual(rows[0]["version"], "1.17.0")
        self.assertEqual(rows[0]["chart_version"], "v1.17.0")

    def test_latest_stable_chart_for_exact_app_not_first_entry(self):
        source = index(chart(version="2.2.0"), chart(version="2.10.0"), chart(version="3.0.0-rc.1"))
        self.assertEqual(SMB.match_stable_charts(source), {"1.20.3": "2.10.0"})

    def test_chart_same_version_cannot_map_different_apps(self):
        with self.assertRaises(SMB.SourceError):
            SMB.match_stable_charts(index(chart(), chart(app="1.20.4")))

    def test_chart_prefix_collision_is_not_arbitrarily_resolved(self):
        with self.assertRaises(SMB.SourceError):
            SMB.match_stable_charts(index(chart(), chart(version="v1.20.3")))

    def test_chart_deprecated_and_prerelease_apps_excluded(self):
        self.assertEqual(SMB.match_stable_charts(index(chart(), chart(app="1.21.0-rc.1", version="1.21.0"),
                                                       chart(app="1.20.4", version="1.20.4", deprecated=True))),
                         {"1.20.3": "1.20.3"})

    def test_missing_exact_chart_does_not_substitute_other_patch(self):
        with self.assertRaises(SMB.SourceError):
            SMB.extract_versions(table("| v1.20.3 | 1.21+ |"), index(chart(app="1.20.1")), "1.36")

    def test_malformed_helm_shapes_fail(self):
        for value in [None, [], {}, {"entries": []}, {"entries": {}}, index(), index("bad")]:
            with self.subTest(value=value), self.assertRaises(SMB.SourceError):
                SMB.match_stable_charts(value)

    def test_wrong_chart_name_and_deprecation_type_fail(self):
        for item in [dict(chart(), name="other"), dict(chart(), deprecated="false")]:
            with self.subTest(item=item), self.assertRaises(SMB.SourceError):
                SMB.match_stable_charts(index(item))

    def test_versions_with_numeric_or_short_forms_are_not_coerced(self):
        for value in [1.2, True, "1.2", "v01.2.3", "1.2.3-rc.1", "1.2.3+local", "1.2.3 "]:
            with self.subTest(value=value):
                self.assertIsNone(SMB.stable_version(value))


class SMBYamlInputTests(unittest.TestCase):
    def test_full_upstream_index_is_loaded_without_losing_entries(self):
        data = SMB.load_chart_index(SOURCE_INDEX_TEXT)
        self.assertEqual(len(data["entries"][SMB.APP_NAME]), 31)
        self.assertEqual(data, yaml.safe_load(SOURCE_INDEX_TEXT))

    def test_same_value_duplicate_key_is_still_rejected(self):
        with self.assertRaises(SMB.SourceError):
            SMB.load_chart_index("apiVersion: v1\napiVersion: v1\n")

    def test_non_string_mapping_key_is_rejected(self):
        with self.assertRaises(SMB.SourceError):
            SMB.load_chart_index("1: example\n")

    def test_yaml_alias_is_explicitly_unsupported(self):
        with self.assertRaises(SMB.SourceError):
            SMB.load_chart_index("base: &base {version: 1.20.3}\ncopy: *base\n")

    def test_yaml_merge_is_rejected(self):
        with self.assertRaises(SMB.SourceError):
            SMB.load_chart_index("entry: {<<: {version: 1.20.3}}")

    def test_non_text_and_oversize_are_rejected(self):
        for value in [None, b"entries: {}", " " * (4 * 1024 * 1024 + 1)]:
            with self.subTest(kind=type(value).__name__), self.assertRaises(SMB.SourceError):
                SMB.load_chart_index(value)

    def test_multiple_yaml_documents_are_rejected(self):
        with self.assertRaises(yaml.YAMLError):
            SMB.load_chart_index("entries: {}\n---\nentries: {}\n")

    def test_safe_loader_never_constructs_python_objects(self):
        with self.assertRaises(yaml.YAMLError):
            SMB.load_chart_index("!!python/tuple [1, 2]")


class SMBIntegrationBoundaryTests(unittest.TestCase):
    def adapter(self, md=SOURCE_MD, idx=SOURCE_INDEX_TEXT, ceiling="1.36"):
        api = types.ModuleType("utils")
        api.current_kube_version = Mock(return_value=ceiling)
        api.fetch_page = Mock(side_effect=lambda url: {
            SMB.README_URL: md.encode() if isinstance(md, str) else md,
            SMB.INDEX_URL: idx.encode() if isinstance(idx, str) else idx,
        }[url])
        api.print_error = Mock()
        api.update_compatibility_info = Mock()
        return api

    def run_scrape(self, api):
        with patch.dict(sys.modules, {"utils": api}):
            SMB.scrape()

    def test_actual_scrape_forwards_all_three_rows_to_existing_updater(self):
        api = self.adapter()
        self.run_scrape(api)
        api.print_error.assert_not_called()
        api.update_compatibility_info.assert_called_once()
        path, rows = api.update_compatibility_info.call_args.args
        self.assertEqual(path, "../../static/compatibilities/csi-driver-smb.yaml")
        self.assertEqual(rows, SMB.extract_versions(SOURCE_MD, SOURCE_INDEX, "1.36"))
        self.assertEqual(api.fetch_page.call_count, 2)

    def test_duplicate_top_level_yaml_is_rejected_before_update(self):
        api = self.adapter(idx="entries: {}\n" + SOURCE_INDEX_TEXT)
        self.run_scrape(api)
        api.update_compatibility_info.assert_not_called()
        api.print_error.assert_called_once()

    def test_duplicate_chart_field_is_rejected_before_update(self):
        bad = SOURCE_INDEX_TEXT.replace("    version: 1.20.3", "    version: 8.9.9\n    version: 1.20.3", 1)
        api = self.adapter(idx=bad)
        self.run_scrape(api)
        api.update_compatibility_info.assert_not_called()
        api.print_error.assert_called_once()

    def test_source_failure_preserves_existing_output_by_never_calling_writer(self):
        for md, idx in [(None, SOURCE_INDEX_TEXT), (SOURCE_MD, None),
                        ("not a table", SOURCE_INDEX_TEXT), (SOURCE_MD, "entries: ["),
                        (b"\xff", SOURCE_INDEX_TEXT)]:
            with self.subTest(md=type(md), idx=type(idx)):
                api = self.adapter(md, idx)
                self.run_scrape(api)
                api.update_compatibility_info.assert_not_called()
                api.print_error.assert_called_once()

    def test_network_exception_does_not_call_writer(self):
        api = self.adapter()
        api.fetch_page.side_effect = TimeoutError("simulated offline retrieval failure")
        self.run_scrape(api)
        api.update_compatibility_info.assert_not_called()
        api.print_error.assert_called_once()

    def test_missing_one_chart_prevents_partial_write(self):
        api = self.adapter(idx=yaml.safe_dump(index(chart())))
        self.run_scrape(api)
        api.update_compatibility_info.assert_not_called()
        api.print_error.assert_called_once()

    def test_invalid_ceiling_stops_before_network(self):
        api = self.adapter(ceiling=None)
        self.run_scrape(api)
        api.fetch_page.assert_not_called()
        api.update_compatibility_info.assert_not_called()

    def test_writer_failure_is_not_reported_as_success(self):
        api = self.adapter()
        api.update_compatibility_info.side_effect = RuntimeError("simulated writer failure")
        with self.assertRaises(RuntimeError):
            self.run_scrape(api)


if __name__ == "__main__":
    unittest.main()
