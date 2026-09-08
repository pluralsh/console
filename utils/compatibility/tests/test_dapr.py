"""Offline regressions for exact Dapr release/CI target provenance."""

from copy import deepcopy
import importlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import requests
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils import reduce_versions, update_versions_data

scraper = importlib.import_module("scrapers.dapr")
FIXTURES = Path(__file__).parent / "fixtures/dapr"
INDEX = (FIXTURES / "index.yaml").read_bytes()
OLD_WORKFLOW = (FIXTURES / "kind-1.16.0.yaml").read_bytes()
NEW_WORKFLOW = (FIXTURES / "kind-1.18.3.yaml").read_bytes()


def index(entries):
    return yaml.safe_dump({"entries": {"dapr": entries}})


def entry(app, chart=None, **extra):
    return dict(name="dapr", appVersion=app, version=chart or app, **extra)


def workflow(url):
    version = url.split("/v", 1)[1].split("/", 1)[0]
    return OLD_WORKFLOW if version in {"1.16.0", "1.16.1", "1.16.2", "1.16.3"} else NEW_WORKFLOW


def stored(version, chart=None):
    row = {"version": version, "kube": ["1.34", "1.33", "1.32"], "requirements": [],
           "incompatibilities": [], "summary": None, "images": []}
    if chart:
        row["chart_version"] = chart
    return row


class ChartTests(unittest.TestCase):
    def test_exact_live_index_fixture_contains_current_three_minor_series(self):
        charts = scraper.parse_charts(INDEX)
        self.assertEqual(set(charts), {"1.16.0", "1.16.3", "1.16.4", "1.16.19", "1.17.0",
                                       "1.17.13", "1.18.0", "1.18.2", "1.18.3"})
        self.assertTrue(all(app == chart for app, chart in charts.items()))

    def test_window_uses_released_app_minors_and_exact_stable_chart_versions(self):
        charts = scraper.parse_charts(index([
            entry("1.15.0"), entry("1.16.0"), entry("1.17.0"), entry("1.18.0", "3.0.0"),
            entry("1.18.0", "3.0.1"), entry("1.18.0", "3.1.0-rc.1"),
            entry("1.19.0-rc.1", "4.0.0"), entry("1.19.0", deprecated=True),
        ]))
        self.assertEqual(charts, {"1.16.0": "1.16.0", "1.17.0": "1.17.0", "1.18.0": "3.0.1"})

    def test_malformed_empty_or_conflicting_chart_index_is_rejected(self):
        for content in ["null", "[]", "entries: []", index([]), index([None]),
                        index([entry("1.18.0-rc.1")]),
                        index([entry("1.17.0", "2.0.0"), entry("1.18.0", "2.0.0")])]:
            with self.subTest(content=content), self.assertRaises(ValueError):
                scraper.parse_charts(content)

    def test_duplicate_yaml_keys_are_rejected_instead_of_overwritten(self):
        with self.assertRaises(ValueError):
            scraper.parse_charts("entries: {}\nentries: {dapr: []}\n")


class MatrixTests(unittest.TestCase):
    def test_release_tagged_fixtures_preserve_the_changed_finite_target_set(self):
        self.assertEqual(scraper.parse_kubernetes_targets(OLD_WORKFLOW), ["1.31", "1.30", "1.29"])
        self.assertEqual(scraper.parse_kubernetes_targets((FIXTURES / "kind-1.16.4.yaml").read_bytes()),
                         ["1.34", "1.33", "1.32"])
        self.assertEqual(scraper.parse_kubernetes_targets(NEW_WORKFLOW), ["1.34", "1.33", "1.32"])

    def changed(self, mutate):
        data = yaml.safe_load(NEW_WORKFLOW)
        mutate(data["jobs"]["e2e"])
        return yaml.safe_dump(data)

    def test_dynamic_prerelease_partial_and_duplicate_targets_fail_closed(self):
        for values in ["${{ fromJSON(needs.setup.outputs.versions) }}", [], ["1.34"],
                       ["v1.35.0-rc.1"], ["v1.34.0", "v1.34.0"]]:
            with self.subTest(values=values), self.assertRaises(ValueError):
                scraper.parse_kubernetes_targets(self.changed(lambda job: job["strategy"]["matrix"].update({"k8s-version": values})))

    def test_unsupported_exclusions_or_axes_are_not_silently_ignored(self):
        for change in [{"exclude": [{"k8s-version": "v1.34.0"}]}, {"os": ["linux", "windows"]}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                scraper.parse_kubernetes_targets(self.changed(lambda job: job["strategy"]["matrix"].update(change)))

    def test_conflicting_or_unpinned_matrix_includes_are_rejected(self):
        for action in [
            lambda matrix: matrix["include"].pop(),
            lambda matrix: matrix["include"].append(dict(matrix["include"][0], **{"kind-image-sha": "sha256:" + "0" * 64})),
            lambda matrix: matrix["include"][0].update({"k8s-version": "v1.35.0"}),
            lambda matrix: matrix["include"][0].update({"kind-image-sha": "latest"}),
        ]:
            with self.subTest(action=action), self.assertRaises(ValueError):
                scraper.parse_kubernetes_targets(self.changed(lambda job: action(job["strategy"]["matrix"])))

    def test_unused_matrix_or_disabled_tests_cannot_establish_coverage(self):
        for content in [
            NEW_WORKFLOW.replace(b"matrix.k8s-version", b"matrix.other-version"),
            NEW_WORKFLOW.replace(b"make test-e2e-all", b"echo tests skipped"),
            self.changed(lambda job: job.update({"if": False})),
        ]:
            with self.subTest(content=content[:80]), self.assertRaises(ValueError):
                scraper.parse_kubernetes_targets(content)

    def test_unlisted_minor_is_not_interpolated(self):
        data = yaml.safe_load(NEW_WORKFLOW)
        matrix = data["jobs"]["e2e"]["strategy"]["matrix"]
        matrix["k8s-version"].remove("v1.33.4")
        matrix["include"] = [row for row in matrix["include"] if row["k8s-version"] != "v1.33.4"]
        self.assertEqual(scraper.parse_kubernetes_targets(yaml.safe_dump(data)), ["1.34", "1.32"])

    def test_commented_build_deploy_or_test_commands_cannot_establish_targets(self):
        for target in [b"build-linux", b"docker-build", b"docker-deploy-k8s", b"test-e2e-all"]:
            with self.subTest(target=target), self.assertRaises(ValueError):
                scraper.parse_kubernetes_targets(NEW_WORKFLOW.replace(b"make " + target, b"# make " + target))

    def test_other_checked_out_revision_or_runner_is_rejected(self):
        def change_checkout(job):
            next(step for step in job["steps"] if step.get("uses", "").startswith("actions/checkout@"))["with"] = {"ref": "master"}
        for action in [change_checkout, lambda job: job.update({"runs-on": "windows-latest"})]:
            with self.subTest(action=action), self.assertRaises(ValueError):
                scraper.parse_kubernetes_targets(self.changed(action))


class UpdateTests(unittest.TestCase):
    def test_boundaries_change_point_and_latest_patch_follow_real_tagged_targets(self):
        rows = scraper.build_updates(scraper.parse_charts(INDEX), [], workflow)
        self.assertEqual([row["version"] for row in rows], ["1.18.3", "1.18.0", "1.17.0", "1.16.4", "1.16.0"])
        self.assertEqual(rows[-1]["kube"], ["1.31", "1.30", "1.29"])
        self.assertEqual(rows[-2]["kube"], ["1.34", "1.33", "1.32"])

    def test_saved_rows_are_not_rewritten_and_repeat_is_noop(self):
        charts = scraper.parse_charts(INDEX)
        existing = reduce_versions(scraper.build_updates(charts, [], workflow))
        existing[0]["summary"] = {"features": ["keep"]}
        existing[0]["eolAt"] = "2027-01-01"
        original = deepcopy(existing)
        self.assertEqual(scraper.build_updates(charts, existing, workflow), [])
        self.assertEqual(existing, original)

    def test_older_stored_series_is_preserved_when_support_window_moves(self):
        existing = [stored("1.15.0", "1.15.0")]
        rows = scraper.build_updates(scraper.parse_charts(INDEX), existing, workflow)
        self.assertEqual(next(r for r in reduce_versions(existing + rows) if r["version"] == "1.15.0"), existing[0])

    def test_delayed_chart_adds_a_real_earlier_boundary(self):
        previous = [stored("1.17.1", "1.17.1")]
        rows = scraper.build_updates({"1.17.0": "1.17.0", "1.17.1": "1.17.1"}, previous, workflow)
        self.assertEqual([r["version"] for r in rows], ["1.17.0"])

    def test_existing_chartless_row_gets_exact_chart_without_losing_metadata(self):
        old = stored("1.17.0")
        old.update(summary={"features": ["keep"]}, eolAt="2027-01-01", kube=["1.33"])
        original = deepcopy(old)
        rows = scraper.build_updates({"1.17.0": "2.0.0"}, [old], lambda _: self.fail("No source refresh for stored coverage"))
        self.assertEqual(rows, [dict(old, chart_version="2.0.0")])
        self.assertEqual(old, original)
        data = {"versions": [old]}
        update_versions_data(data, deepcopy(rows))
        self.assertEqual(scraper.build_updates({"1.17.0": "2.0.0"}, data["versions"], workflow), [])

    def test_chart_matching_precedes_version_reduction(self):
        rows = scraper.build_updates({"1.18.2": "1.18.2", "1.18.3": "1.18.3"}, [], workflow)
        self.assertEqual([row["version"] for row in rows], ["1.18.3", "1.18.2"])
        self.assertNotIn("1.18.0", [row["version"] for row in rows])


class ScrapeTests(unittest.TestCase):
    def test_source_http_timeout_or_bad_workflow_never_writes_partial_data(self):
        for failure in [requests.Timeout("timeout"), requests.HTTPError("404"), [INDEX, b"jobs: {}"]]:
            with self.subTest(failure=failure), patch.object(scraper, "read_yaml", return_value={"versions": []}), \
                    patch.object(scraper, "_fetch", side_effect=failure), patch.object(scraper, "print_error"), \
                    patch.object(scraper, "update_compatibility_info") as update:
                scraper.scrape()
                update.assert_not_called()

    def test_invalid_local_metadata_does_not_fetch(self):
        with patch.object(scraper, "read_yaml", return_value=None), patch.object(scraper, "_fetch") as fetch, \
                patch.object(scraper, "print_error"), patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
            fetch.assert_not_called()
            update.assert_not_called()

    def test_fresh_scrape_uses_finite_chart_backed_rows(self):
        def fetch(url):
            return INDEX if url == scraper.INDEX_URL else workflow(url)
        with patch.object(scraper, "read_yaml", return_value={"versions": []}), \
                patch.object(scraper, "_fetch", side_effect=fetch), patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
            self.assertEqual([r["version"] for r in update.call_args.args[1]], ["1.18.3", "1.18.0", "1.17.0", "1.16.4", "1.16.0"])

    def test_http_requests_use_timeout_and_status_validation(self):
        with patch.object(scraper.requests, "get") as get:
            get.return_value.content = b"source"
            self.assertEqual(scraper._fetch(scraper.INDEX_URL), b"source")
            get.assert_called_once_with(scraper.INDEX_URL, timeout=30)
            get.return_value.raise_for_status.assert_called_once_with()


class GeneratedDataTests(unittest.TestCase):
    def test_registered_app_and_aggregate_match_the_source_backed_rows(self):
        root = Path(__file__).resolve().parents[3]
        app = yaml.safe_load((root / "static/compatibilities/dapr.yaml").read_text())
        manifest = yaml.safe_load((root / "static/compatibilities/manifest.yaml").read_text())
        aggregate = yaml.safe_load((root / "static/compatibilities.yaml").read_text())
        self.assertEqual(manifest["names"].count("dapr"), 1)
        self.assertEqual([a for a in aggregate["addons"] if a["name"] == "dapr"], [dict(app, name="dapr")])
        self.assertEqual([r["version"] for r in app["versions"]], ["1.18.3", "1.18.0", "1.17.0", "1.16.4", "1.16.0"])
        for row in app["versions"]:
            version = row["version"]
            self.assertEqual(row["chart_version"], version)
            self.assertEqual(row["kube"], ["1.31", "1.30", "1.29"] if version == "1.16.0" else ["1.34", "1.33", "1.32"])
            self.assertEqual(row["images"], [f"ghcr.io/dapr/{name}:{version}" for name in
                                             ["injector", "operator", "placement", "scheduler", "sentry"]])


if __name__ == "__main__":
    unittest.main()
