"""Offline tests for Kubewarden's current admission-controller chart scraper."""

import copy
import importlib.util
from pathlib import Path
import random
import sys
import unittest
from collections import OrderedDict
from unittest.mock import patch

import yaml


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY_DIR))
SPEC = importlib.util.spec_from_file_location(
    "kubewarden_scraper",
    COMPATIBILITY_DIR / "scrapers" / "kubewarden.py",
)
scraper = importlib.util.module_from_spec(SPEC)
with patch("requests.sessions.Session.request", side_effect=AssertionError("Unexpected network request")):
    SPEC.loader.exec_module(scraper)


def chart(version="6.0.2", app_version="v1.37.2", kube_version=">= 1.19.0-0", **extra):
    """Construct input records, not a model of the scraper's implementation."""
    return {
        "name": "admission-controller",
        "version": version,
        "appVersion": app_version,
        "kubeVersion": kube_version,
        **extra,
    }


def index_with(*entries):
    return {"apiVersion": "v1", "entries": {"admission-controller": list(entries)}}


class OfflineScraperTest(unittest.TestCase):
    def setUp(self):
        network = patch("requests.sessions.Session.request", side_effect=AssertionError("Unexpected network request"))
        network.start()
        self.addCleanup(network.stop)


class KubernetesConstraintTests(OfflineScraperTest):
    def test_observed_floor_expands_only_through_current_minor(self):
        self.assertEqual(
            scraper.parse_kube_versions(">= 1.19.0-0", "1.22"),
            ["1.22", "1.21", "1.20", "1.19"],
        )

    def test_whole_minor_floor_without_helm_prerelease_sentinel(self):
        self.assertEqual(scraper.parse_kube_versions(">=1.20.0", "1.22"), ["1.22", "1.21", "1.20"])

    def test_equal_floor_and_cap_keeps_that_minor(self):
        self.assertEqual(scraper.parse_kube_versions(">= 1.19.0-0", "1.19"), ["1.19"])

    def test_future_floor_does_not_claim_current_compatibility(self):
        self.assertEqual(scraper.parse_kube_versions(">= 1.37.0-0", "1.36"), [])

    def test_unknown_or_partial_minor_constraints_are_not_guessed(self):
        constraints = [
            None, "", 119, {}, [],
            ">= 1.19.1", ">= 1.19.1-0", "> 1.19.0", ">= 1.19",
            "1.19.0", "~1.19.0", "^1.19.0", "1.19.x", "*",
            ">= 1.19.0 < 1.30.0", ">= 1.19.0 || >= 1.25.0",
            ">= 1.19.0, < 1.30.0", ">= 1.19.0-rc.1", ">= 1.19.0+build",
            ">= 2.0.0", "prefix >= 1.19.0", ">= 1.19.0 trailing",
        ]
        for constraint in constraints:
            with self.subTest(constraint=constraint):
                self.assertEqual(scraper.parse_kube_versions(constraint, "1.36"), [])

    def test_invalid_current_kubernetes_version_yields_no_claim(self):
        for latest in (None, "", "latest", "1", "1.-1", "2.0", "1.36-rc.1", {}, []):
            with self.subTest(latest=latest):
                self.assertEqual(scraper.parse_kube_versions(">= 1.19.0-0", latest), [])


class ChartIndexTests(OfflineScraperTest):
    def test_current_published_chart_fixture_uses_app_not_chart_version(self):
        fixture = Path(__file__).parent / "fixtures" / "kubewarden_admission_controller_index.yaml"
        data = yaml.safe_load(fixture.read_text(encoding="utf-8"))
        rows = scraper.extract_versions(data, "1.21")
        self.assertEqual(
            rows,
            [
                OrderedDict([
                    ("version", "1.37.2"),
                    ("kube", ["1.21", "1.20", "1.19"]),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", "6.0.2"),
                ]),
                OrderedDict([
                    ("version", "1.37.1"),
                    ("kube", ["1.21", "1.20", "1.19"]),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", "6.0.1"),
                ]),
                OrderedDict([
                    ("version", "1.37.0"),
                    ("kube", ["1.21", "1.20", "1.19"]),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", "6.0.0"),
                ]),
            ],
        )
        self.assertTrue(all(isinstance(row, OrderedDict) for row in rows))

    def test_other_chart_keys_cannot_supply_or_override_versions(self):
        data = index_with(chart())
        data["entries"]["kubewarden-controller"] = [chart("99.0.0", "v99.0.0")]
        data["entries"]["kubewarden-crds"] = [chart("100.0.0", "v100.0.0")]
        self.assertEqual([row["version"] for row in scraper.extract_versions(data, "1.20")], ["1.37.2"])
        self.assertEqual(scraper.extract_versions({"entries": {"kubewarden-controller": [chart()]}}, "1.20"), [])

    def test_newest_eligible_chart_is_numeric_and_independent_of_index_order(self):
        entries = [
            chart("6.9.0", "v1.37.2", ">= 1.19.0-0"),
            chart("6.10.0", "1.37.2", ">= 1.20.0-0"),
            chart("7.0.0-rc.1", "v1.37.2"),
            chart("7.0.0+build.1", "v1.37.2"),
            chart("8.0.0", "v1.37.2", deprecated=True),
            chart("9.0.0", "v1.37.2", ">= 1.50.0"),
            chart("10.0.0", "v1.37.2", ">= 1.19.1"),
        ]
        for seed in range(8):
            shuffled = copy.deepcopy(entries)
            random.Random(seed).shuffle(shuffled)
            with self.subTest(seed=seed):
                rows = scraper.extract_versions(index_with(*shuffled), "1.22")
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["chart_version"], "6.10.0")
                self.assertEqual(rows[0]["version"], "1.37.2")
                self.assertEqual(rows[0]["kube"], ["1.22", "1.21", "1.20"])

    def test_application_versions_sort_numerically_descending(self):
        rows = scraper.extract_versions(index_with(
            chart("6.0.0", "v1.9.0"),
            chart("7.0.0", "v1.37.2"),
            chart("8.0.0", "v1.37.10"),
            chart("9.0.0", "v2.0.0"),
        ), "1.20")
        self.assertEqual([row["version"] for row in rows], ["2.0.0", "1.37.10", "1.37.2", "1.9.0"])

    def test_prerelease_build_and_malformed_versions_are_excluded_on_both_axes(self):
        invalid = (None, "", "1.37", "01.37.2", "1.37.2-rc.1", "1.37.2+build.1", "next", {}, [], 1372)
        for value in invalid:
            for field in ("version", "appVersion"):
                with self.subTest(field=field, value=value):
                    bad = chart()
                    bad[field] = value
                    rows = scraper.extract_versions(index_with(bad, chart("5.0.0", "v1.36.0")), "1.20")
                    self.assertEqual([row["version"] for row in rows], ["1.36.0"])

    def test_deprecated_only_release_is_omitted(self):
        self.assertEqual(scraper.extract_versions(index_with(chart(deprecated=True)), "1.20"), [])

    def test_malformed_records_do_not_hide_valid_neighbors(self):
        entries = [None, [], "bad", 7, {}, {"version": "6.0.0"}, chart(kube_version=None), chart()]
        rows = scraper.extract_versions(index_with(*entries), "1.20")
        self.assertEqual([row["version"] for row in rows], ["1.37.2"])

    def test_malformed_index_shapes_are_empty(self):
        invalid = [
            None, [], "bad", {}, {"entries": None}, {"entries": []},
            {"entries": {"admission-controller": None}},
            {"entries": {"admission-controller": {"version": "6.0.2"}}},
            {"entries": {"admission-controller": "bad"}},
        ]
        for data in invalid:
            with self.subTest(data=data):
                self.assertEqual(scraper.extract_versions(data, "1.20"), [])

    def test_invalid_current_version_yields_no_rows(self):
        self.assertEqual(scraper.extract_versions(index_with(chart()), "unknown"), [])

    def test_index_and_nested_entries_are_not_mutated(self):
        data = index_with(chart("6.9.0"), chart("6.10.0"))
        original = copy.deepcopy(data)
        scraper.extract_versions(data, "1.22")
        self.assertEqual(data, original)


class RuntimeCatalogTests(OfflineScraperTest):
    def setUp(self):
        super().setUp()
        fixture = Path(__file__).parent / "fixtures" / "kubewarden_deployment_labels.yaml"
        self.deployments = yaml.safe_load(fixture.read_text(encoding="utf-8"))["charts"]
        self.catalog_dir = COMPATIBILITY_DIR.parents[1] / "static" / "compatibilities"

    def test_catalog_key_is_published_as_a_supported_runtime_label(self):
        # AddRuntimeServiceInfo explicitly checks app.kubernetes.io/part-of;
        # validLabel directly accepts a value present in supportedAddons.
        # See go/deployment-operator/pkg/ping/runtime_service.go. This checks
        # the chart/catalog boundary without reimplementing the Go detector.
        manifest = yaml.safe_load((self.catalog_dir / "manifest.yaml").read_text(encoding="utf-8"))
        catalog_key = Path(scraper.TARGET_FILE).stem
        for deployment in self.deployments:
            with self.subTest(chart=deployment["chart_version"]):
                labels = deployment["metadata"]["labels"]
                self.assertEqual(deployment["kind"], "Deployment")
                self.assertEqual(catalog_key, labels["app.kubernetes.io/part-of"])
                self.assertEqual(scraper.APP_NAME, catalog_key)
                self.assertIn(catalog_key, manifest["names"])
        catalog = yaml.safe_load((self.catalog_dir / f"{catalog_key}.yaml").read_text(encoding="utf-8"))
        self.assertEqual(catalog["chart_name"], scraper.CHART_NAME)

    def test_rendered_version_labels_resolve_to_extracted_application_rows(self):
        # Use the frozen source index: scheduled catalog reduction may replace
        # a historical patch row once a later application minor is released.
        fixture = Path(__file__).parent / "fixtures" / "kubewarden_admission_controller_index.yaml"
        index = yaml.safe_load(fixture.read_text(encoding="utf-8"))
        rows = {row["version"]: row for row in scraper.extract_versions(index, "1.21")}
        for deployment in self.deployments:
            with self.subTest(chart=deployment["chart_version"]):
                label_version = deployment["metadata"]["labels"]["app.kubernetes.io/version"]
                app_version = label_version.removeprefix("v")
                self.assertIn(app_version, rows)
                self.assertEqual(rows[app_version]["chart_version"], deployment["chart_version"])


class ScrapeWorkflowTests(OfflineScraperTest):
    def setUp(self):
        super().setUp()
        fixtures = Path(__file__).parent / "fixtures"
        self.index = (fixtures / "kubewarden_admission_controller_index.yaml").read_text(encoding="utf-8")
        self.docs = (fixtures / "kubewarden_admission_policy_minimum.html").read_text(encoding="utf-8")

    def test_fetches_docs_once_per_series_and_publishes_only_intersection(self):
        with patch.object(scraper, "_fetch", side_effect=[self.index, self.docs]) as fetch, \
                patch.object(scraper, "current_kube_version", return_value="1.23"), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        self.assertEqual(fetch.call_count, 2)
        self.assertEqual(fetch.call_args_list[0].args, (scraper.INDEX_URL,))
        self.assertEqual(fetch.call_args_list[1].args, (scraper.DOCS_URL.format(series="1.37"),))
        update.assert_called_once()
        target, rows = update.call_args.args
        self.assertEqual(target, scraper.TARGET_FILE)
        self.assertEqual([row["version"] for row in rows], ["1.37.2", "1.37.1", "1.37.0"])
        self.assertTrue(all(row["kube"] == ["1.23", "1.22", "1.21"] for row in rows))

    def test_missing_docs_do_not_borrow_another_series_minimum(self):
        data = yaml.safe_load(self.index)
        data["entries"]["admission-controller"].append(chart("5.0.0", "v1.36.9"))
        responses = {
            scraper.INDEX_URL: yaml.safe_dump(data),
            scraper.DOCS_URL.format(series="1.37"): self.docs,
            scraper.DOCS_URL.format(series="1.36"): None,
        }
        with patch.object(scraper, "_fetch", side_effect=responses.__getitem__) as fetch, \
                patch.object(scraper, "current_kube_version", return_value="1.23"), \
                patch.object(scraper, "print_error"), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        self.assertEqual(fetch.call_count, 3)
        update.assert_called_once()
        self.assertEqual([row["version"] for row in update.call_args.args[1]], ["1.37.2", "1.37.1", "1.37.0"])

    def test_no_verified_documentation_prevents_output_write(self):
        for docs in (None, "<html>Documentation moved</html>"):
            with self.subTest(docs=docs), \
                    patch.object(scraper, "_fetch", side_effect=[self.index, docs]), \
                    patch.object(scraper, "current_kube_version", return_value="1.23"), \
                    patch.object(scraper, "print_error"), \
                    patch.object(scraper, "update_compatibility_info") as update:
                scraper.scrape()
                update.assert_not_called()

    def test_missing_or_malformed_index_prevents_docs_fetch_and_output_write(self):
        for content in (None, "entries: [", "entries: {}"):
            with self.subTest(content=content), \
                    patch.object(scraper, "_fetch", return_value=content) as fetch, \
                    patch.object(scraper, "current_kube_version", return_value="1.23"), \
                    patch.object(scraper, "print_error"), \
                    patch.object(scraper, "update_compatibility_info") as update:
                scraper.scrape()
                fetch.assert_called_once_with(scraper.INDEX_URL)
                update.assert_not_called()


class PolicyMinimumTests(OfflineScraperTest):
    def test_versioned_quick_start_explicit_minimum_across_html_nodes(self):
        fixture = Path(__file__).parent / "fixtures" / "kubewarden_admission_policy_minimum.html"
        self.assertEqual(scraper.parse_policy_minimum(fixture.read_text(encoding="utf-8")), "1.21")

    def test_no_inference_from_unrelated_versions_or_policy_names(self):
        for html in (
            "", "<p>Kubernetes 1.21.0 is supported.</p>",
            "<p>ClusterAdmissionPolicy requires Kubernetes 1.21.0 or greater.</p>",
            "<p>AdmissionPolicy is enabled.</p><p>Another component requires Kubernetes 1.21.0 or greater.</p>",
        ):
            with self.subTest(html=html):
                self.assertIsNone(scraper.parse_policy_minimum(html))

    def test_conflicting_explicit_minima_are_ambiguous(self):
        html = (
            "<p>AdmissionPolicy requires Kubernetes 1.21.0 or greater.</p>"
            "<p>AdmissionPolicy requires Kubernetes 1.25.0 or greater.</p>"
        )
        self.assertIsNone(scraper.parse_policy_minimum(html))

    def test_patch_minimum_cannot_be_reported_as_a_whole_supported_minor(self):
        self.assertIsNone(scraper.parse_policy_minimum("<p>AdmissionPolicy requires Kubernetes 1.21.1 or greater.</p>"))

    def test_supported_floor_does_not_hide_an_unsupported_conflicting_requirement(self):
        html = (
            "<p>AdmissionPolicy requires Kubernetes 1.21.0 or greater.</p>"
            "<p>AdmissionPolicy requires Kubernetes 1.25.1 or greater.</p>"
        )
        self.assertIsNone(scraper.parse_policy_minimum(html))

    def test_same_explicit_minimum_repeated_is_consistent(self):
        note = "<p>AdmissionPolicy requires Kubernetes 1.21.0 or greater.</p>"
        self.assertEqual(scraper.parse_policy_minimum(note + note), "1.21")

    def test_policy_floor_intersects_helm_support_and_preserves_row_metadata(self):
        rows = scraper.extract_versions(index_with(chart()), "1.23")
        original = copy.deepcopy(rows)
        clamped = scraper.apply_policy_minimum(rows, "1.21")
        self.assertEqual(clamped, [OrderedDict([
            ("version", "1.37.2"),
            ("kube", ["1.23", "1.22", "1.21"]),
            ("requirements", []),
            ("incompatibilities", []),
            ("chart_version", "6.0.2"),
        ])])
        self.assertEqual(rows, original)
        self.assertIsNot(clamped, rows)
        self.assertIsNot(clamped[0], rows[0])

    def test_policy_floor_does_not_expand_a_stricter_chart_range(self):
        rows = scraper.extract_versions(index_with(chart(kube_version=">= 1.23.0")), "1.24")
        self.assertEqual(scraper.apply_policy_minimum(rows, "1.21")[0]["kube"], ["1.24", "1.23"])

    def test_policy_floor_comparison_is_numeric_and_inclusive(self):
        rows = scraper.extract_versions(index_with(chart(kube_version=">= 1.8.0")), "1.10")
        self.assertEqual(scraper.apply_policy_minimum(rows, "1.9")[0]["kube"], ["1.10", "1.9"])

    def test_empty_intersection_omits_only_unsupported_rows(self):
        rows = scraper.extract_versions(index_with(chart()), "1.20")
        self.assertEqual(scraper.apply_policy_minimum(rows, "1.21"), [])
        self.assertEqual(scraper.apply_policy_minimum([], "1.21"), [])

    def test_unknown_policy_minimum_does_not_publish_helm_only_support(self):
        rows = scraper.extract_versions(index_with(chart()), "1.23")
        for minimum in (None, "", "unknown"):
            with self.subTest(minimum=minimum):
                self.assertEqual(scraper.apply_policy_minimum(rows, minimum), [])


if __name__ == "__main__":
    unittest.main()
