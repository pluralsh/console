import importlib.util
from pathlib import Path
import subprocess
import sys
from types import ModuleType
import unittest
from unittest.mock import Mock, patch

import requests
import yaml


PATH = Path(__file__).parents[1] / "scrapers" / "kube-ovn.py"
spec = importlib.util.spec_from_file_location("kube_ovn", PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def chart(tag, app=None, constraint=">= 1.29.0-0"):
    return {
        "name": "kube-ovn-v2",
        "version": tag,
        "appVersion": app or tag.removeprefix("v"),
        "kubeVersion": constraint,
    }


def response(data, next_url=None):
    result = Mock()
    result.json.return_value = data
    result.links = {"next": {"url": next_url}} if next_url else {}
    return result


class KubeOvnTests(unittest.TestCase):
    def test_minor_floor_is_inclusive_and_bounded_by_plural(self):
        self.assertEqual(
            scraper.kubernetes_versions(">= 1.29.0-0", "1.31"),
            ["1.31", "1.30", "1.29"],
        )
        self.assertEqual(scraper.kubernetes_versions(">=v1.29.0", "1.29"), ["1.29"])

    def test_unsupported_constraints_never_broaden_compatibility(self):
        for value in [None, "", ">=1.29.1", ">1.29.0", ">=1.29.0 <1.31.0",
                      ">=1.29.0 || >=2.0.0", "^1.29.0", ">=2.0.0", ">=1.29.0-rc.1"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                scraper.kubernetes_versions(value, "1.36")

    def test_missing_or_older_plural_ceiling_fails(self):
        for current in [None, "latest", "1.28", "2.0", "1.36.1"]:
            with self.subTest(current=current), self.assertRaises(ValueError):
                scraper.kubernetes_versions(">=1.29.0-0", current)

    def test_chart_application_versions_and_exact_tags_are_distinct(self):
        fixtures = {
            "1.14.2": chart("1.14.2"),
            "v1.15.1": chart("v1.15.1"),
            "v1.15.2": chart("v1.15.2", app="1.15.1"),
            "v1.16.0": chart("v1.16.0", constraint=">=1.30.0-0"),
        }
        tags = ["latest", "v1.17.0-rc.1", *fixtures, "v1.16.0"]
        rows = scraper.build_rows(tags, "1.31", fixtures.__getitem__)
        self.assertEqual([r["version"] for r in rows], ["1.16.0", "1.15.1", "1.14.2"])
        self.assertEqual([r["chart_version"] for r in rows], ["v1.16.0", "v1.15.2", "1.14.2"])
        self.assertEqual(rows[0]["kube"], ["1.31", "1.30"])
        self.assertEqual(rows[1]["kube"], ["1.31", "1.30", "1.29"])

    def test_order_and_alias_selection_are_deterministic(self):
        tags = ["1.15.0", "v1.15.0", "v1.16.0"]
        self.assertEqual(
            scraper.build_rows(tags, "1.30", chart),
            scraper.build_rows(list(reversed(tags)), "1.30", chart),
        )

    def test_conflicting_aliases_fail(self):
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            scraper.build_rows(
                ["1.15.0", "v1.15.0"], "1.31",
                lambda tag: chart(tag, constraint=">=1.29.0" if tag[0] == "v" else ">=1.30.0"),
            )

    def test_bad_chart_metadata_fails(self):
        bad = [None, [], {}, {**chart("1.15.0"), "name": "kube-ovn"},
               chart("1.14.0"), chart("1.15.0", app="1.15.0-rc.1"),
               {**chart("1.15.0"), "appVersion": None}]
        for metadata in bad:
            with self.subTest(metadata=metadata), self.assertRaises(ValueError):
                scraper.build_rows(["1.15.0"], "1.30", lambda _: metadata)

    def test_no_stable_charts_is_an_error(self):
        with self.assertRaises(ValueError):
            scraper.build_rows(["latest", "v1.0.0-rc.1", "01.2.3"], "1.36", Mock())

    def test_fetch_chart_uses_helm_and_preserves_registry_tag(self):
        with patch.object(scraper.subprocess, "run", return_value=Mock(
            stdout=yaml.safe_dump(chart("v1.16.3"))
        )) as run:
            self.assertEqual(scraper.fetch_chart("v1.16.3"), chart("v1.16.3"))
        self.assertEqual(run.call_args.args[0], [
            "helm", "show", "chart", scraper.CHART_URL, "--version", "v1.16.3"
        ])
        self.assertTrue(run.call_args.kwargs["check"])
        self.assertEqual(run.call_args.kwargs["timeout"], 60)

    def test_fetch_chart_propagates_download_failure(self):
        with patch.object(scraper.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "helm")):
            with self.assertRaises(subprocess.CalledProcessError):
                scraper.fetch_chart("1.15.0")

    def test_tags_pagination_deduplicates_and_sorts_semantically(self):
        pages = [
            response({"token": "test-anonymous-token"}),
            response({"name": scraper.REGISTRY_PATH, "tags": ["v1.9.0", "1.14.2", "latest"]},
                     "?n=3&last=latest"),
            response({"name": scraper.REGISTRY_PATH, "tags": ["v1.16.3", "1.14.2", "v1.17.0-rc.1"]}),
        ]
        with patch.object(scraper.requests, "get", side_effect=pages) as get:
            self.assertEqual(scraper.fetch_tags(), ["v1.16.3", "1.14.2", "v1.9.0"])
        self.assertEqual(get.call_count, 3)
        self.assertEqual(get.call_args.args[0], scraper.TAGS_URL + "?n=3&last=latest")

    def test_pagination_rejects_external_and_repeated_links(self):
        for link in ["https://example.com/token", "/v2/another/repo/tags/list",
                     scraper.TAGS_URL + "?n=1000"]:
            pages = [response({"token": "test-anonymous-token"}),
                     response({"name": scraper.REGISTRY_PATH, "tags": []}, link)]
            with self.subTest(link=link), patch.object(scraper.requests, "get", side_effect=pages) as get:
                with self.assertRaisesRegex(ValueError, "pagination"):
                    scraper.fetch_tags()
                self.assertEqual(get.call_count, 2)

    def test_malformed_tags_or_token_fails(self):
        for payload in [{"name": "different/repository", "tags": []},
                        {"name": scraper.REGISTRY_PATH, "tags": None},
                        {"name": scraper.REGISTRY_PATH, "tags": [3]}]:
            with self.subTest(payload=payload), patch.object(scraper.requests, "get", side_effect=[
                response({"token": "test-anonymous-token"}), response(payload)
            ]), self.assertRaises(ValueError):
                scraper.fetch_tags()
        with patch.object(scraper.requests, "get", return_value=response({})), self.assertRaises(ValueError):
            scraper.fetch_tags()

    def test_http_failure_is_not_an_empty_success(self):
        failed = response({})
        failed.raise_for_status.side_effect = requests.HTTPError("rate limited")
        with patch.object(scraper.requests, "get", return_value=failed), self.assertRaises(requests.HTTPError):
            scraper.fetch_tags()

    def test_scrape_validates_all_charts_before_update(self):
        helpers = ModuleType("utils")
        helpers.current_kube_version = Mock(return_value="1.30")
        helpers.update_compatibility_info = Mock()
        with patch.dict(sys.modules, {"utils": helpers}), patch.object(
            scraper, "fetch_tags", return_value=["1.15.0", "v1.16.0"]
        ), patch.object(scraper.subprocess, "run", side_effect=[
            Mock(stdout=yaml.safe_dump(chart("1.15.0"))),
            Mock(stdout=yaml.safe_dump(chart("v1.16.0", constraint=">=1.31.0"))),
        ]), self.assertRaises(ValueError):
            scraper.scrape()
        helpers.update_compatibility_info.assert_not_called()

    def test_scrape_passes_validated_rows_to_catalog_updater(self):
        helpers = ModuleType("utils")
        helpers.current_kube_version = Mock(return_value="1.30")
        helpers.update_compatibility_info = Mock()
        with patch.dict(sys.modules, {"utils": helpers}), patch.object(
            scraper, "fetch_tags", return_value=["1.15.0"]
        ), patch.object(scraper.subprocess, "run", return_value=Mock(stdout=yaml.safe_dump(chart("1.15.0")))), patch.object(
            scraper, "chart_images", return_value=["docker.io/kubeovn/kube-ovn:v1.15.0"]
        ):
            scraper.scrape()
        helpers.update_compatibility_info.assert_called_once_with(
            "../../static/compatibilities/kube-ovn.yaml",
            [{"version": "1.15.0", "kube": ["1.30", "1.29"], "chart_version": "1.15.0",
              "requirements": [], "incompatibilities": [],
              "images": ["docker.io/kubeovn/kube-ovn:v1.15.0"]}],
        )

    def test_mislabelled_historical_charts_are_excluded(self):
        rows = scraper.build_rows(["1.14.2", "1.15.0", "v1.15.1"], "1.30", chart)
        images = {
            "1.14.2": ["docker.io/kubeovn/kube-ovn:v1.14.0"],
            "1.15.0": ["docker.io/kubeovn/kube-ovn:v1.14.0",
                       "docker.io/kubeovn/vpc-nat-gateway:v1.15.0"],
            "v1.15.1": ["docker.io/kubeovn/kube-ovn:v1.15.1",
                        "docker.io/kubeovn/vpc-nat-gateway:v1.15.1"],
        }
        verified = scraper.verify_images(rows, "1.30", lambda tag, _: images[tag])
        self.assertEqual([r["version"] for r in verified], ["1.15.1"])
        self.assertEqual(verified[0]["images"], images["v1.15.1"])

    def test_missing_or_unversioned_image_is_a_failure(self):
        rows = scraper.build_rows(["v1.16.0"], "1.30", chart)
        for images in [[], ["docker.io/kubeovn/vpc-nat-gateway:v1.16.0"],
                       ["docker.io/kubeovn/kube-ovn:latest"]]:
            with self.subTest(images=images), self.assertRaises(ValueError):
                scraper.verify_images(rows, "1.30", lambda *_: images)

    def test_all_mismatched_charts_are_an_error(self):
        rows = scraper.build_rows(["1.15.0"], "1.30", chart)
        with self.assertRaises(ValueError):
            scraper.verify_images(rows, "1.30", lambda *_: ["kubeovn/kube-ovn:v1.14.0"])

    def test_chart_image_download_failure_prevents_catalog_update(self):
        helpers = ModuleType("utils")
        helpers.current_kube_version = Mock(return_value="1.30")
        helpers.update_compatibility_info = Mock()
        with patch.dict(sys.modules, {"utils": helpers}), patch.object(
            scraper, "fetch_tags", return_value=["v1.16.0"]
        ), patch.object(scraper, "fetch_chart", return_value=chart("v1.16.0")), patch.object(
            scraper, "chart_images", side_effect=subprocess.CalledProcessError(1, "helm")
        ), self.assertRaises(subprocess.CalledProcessError):
            scraper.scrape()
        helpers.update_compatibility_info.assert_not_called()


if __name__ == "__main__":
    unittest.main()
