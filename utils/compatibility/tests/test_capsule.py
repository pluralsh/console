import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

import requests
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scrapers import capsule


FIXTURES = Path(__file__).parent / "fixtures" / "capsule"
RELEASES = json.loads((FIXTURES / "releases.json").read_text())


def release(version, kube="1.36"):
    result = copy.deepcopy(RELEASES[0])
    result["tag_name"] = "v" + version
    result["body"] = result["body"].replace("1.36", kube)
    return result


class CapsuleTests(unittest.TestCase):
    def test_official_quoted_and_unquoted_tables(self):
        self.assertEqual(capsule.parse_compatibility(RELEASES[0]["body"]), ["1.36"])
        self.assertEqual(capsule.parse_compatibility(RELEASES[1]["body"]), ["1.31"])

    def test_no_future_or_older_versions_inferred(self):
        # The prose says 'latest' and the minimum cell says >=; neither makes
        # Kubernetes 1.37 or 1.35 part of the explicit 1.36 support row.
        rows = capsule.extract_versions([release("0.14.4")])
        self.assertEqual(rows[0]["kube"], ["1.36"])

    def test_skips_unpublished_prerelease_and_undocumented_versions(self):
        draft = release("0.15.0")
        draft["draft"] = True
        prerelease = release("0.16.0")
        prerelease["prerelease"] = True
        legacy = release("0.7.3")
        legacy["body"] = "Bug fixes only."
        rows = capsule.extract_versions([draft, prerelease, legacy, release("0.14.4-rc.1"), release("0.14.4")])
        self.assertEqual([r["version"] for r in rows], ["0.14.4"])

    def test_retains_minor_support_change_and_latest_boundaries(self):
        releases = [release("0.13.0", "1.35"), release("0.13.1", "1.35"),
                    release("0.14.0", "1.35"), release("0.14.1", "1.36"),
                    release("0.14.2", "1.36"), release("0.14.4", "1.36")]
        rows = capsule.extract_versions(list(reversed(releases)))
        self.assertEqual([r["version"] for r in rows], ["0.14.4", "0.14.1", "0.14.0", "0.13.0"])
        self.assertEqual([r["kube"] for r in rows], [["1.36"], ["1.36"], ["1.35"], ["1.35"]])

    def test_rejects_inexpressible_or_malformed_tables(self):
        body = RELEASES[0]["body"]
        for bad in (
            body.replace(">= 1.36.0", ">= 1.36.1"),
            body.replace(">= 1.36.0", ">= 1.35.0"),
            body.replace("`v1.36`", "`v1.36+`"),
            body.replace("Minimum required", "Other heading"),
            body.replace("| `v1.36`", "| extra | `v1.36`"),
            "Kubernetes compatibility\n| Kubernetes version | Minimum required |\n|---|---|\n",
        ):
            with self.subTest(body=bad), self.assertRaises(ValueError):
                capsule.parse_compatibility(bad)

    def test_rejects_duplicate_versions_and_empty_results(self):
        with self.assertRaises(ValueError):
            capsule.extract_versions([release("0.14.4"), release("0.14.4")])
        with self.assertRaises(ValueError):
            capsule.extract_versions([])

    def test_paginates_release_history(self):
        first, second = Mock(), Mock()
        first.json.return_value = [release("0.14.4")] * 100
        second.json.return_value = [release("0.7.4")]
        with patch.object(capsule.requests, "get", side_effect=[first, second]) as get:
            self.assertEqual(len(capsule.fetch_releases()), 101)
            self.assertEqual([c.kwargs["params"]["page"] for c in get.call_args_list], [1, 2])
        first.raise_for_status.assert_called_once()
        second.raise_for_status.assert_called_once()

    def test_http_failure_and_invalid_response_abort_before_write(self):
        response = Mock()
        response.json.return_value = {"message": "rate limit"}
        with patch.object(capsule.requests, "get", return_value=response), \
             patch.object(capsule, "update_compatibility_info") as update:
            with self.assertRaises(ValueError):
                capsule.scrape()
            update.assert_not_called()
        response.raise_for_status.side_effect = requests.HTTPError("503")
        with patch.object(capsule.requests, "get", return_value=response), \
             patch.object(capsule, "update_compatibility_info") as update:
            with self.assertRaises(requests.HTTPError):
                capsule.scrape()
            update.assert_not_called()

    def test_published_chart_metadata_must_match(self):
        chart = yaml.safe_load((FIXTURES / "chart.yaml").read_text())
        result = subprocess.CompletedProcess([], 0, stdout=yaml.safe_dump(chart))
        with patch.object(capsule.subprocess, "run", return_value=result):
            self.assertEqual(capsule.chart_version_for("0.14.4"), "0.14.4")
            with self.assertRaises(ValueError):
                capsule.chart_version_for("0.14.3")
        for field, value in (("name", "capsule-proxy"), ("appVersion", "0.0.0"), ("version", "0.0.0")):
            bad = {**chart, field: value}
            result.stdout = yaml.safe_dump(bad)
            with self.subTest(field=field), patch.object(capsule.subprocess, "run", return_value=result), self.assertRaises(ValueError):
                capsule.chart_version_for("0.14.4")

    def test_missing_chart_or_malformed_release_never_partially_writes(self):
        with patch.object(capsule, "fetch_releases", return_value=[release("0.14.4"), release("0.13.0", "1.35")]), \
             patch.object(capsule, "chart_version_for", side_effect=["0.14.4", subprocess.TimeoutExpired("helm", 120)]), \
             patch.object(capsule, "update_compatibility_info") as update:
            with self.assertRaises(subprocess.TimeoutExpired):
                capsule.scrape()
            update.assert_not_called()
        bad = release("0.13.0")
        bad["body"] = "Kubernetes compatibility\nchanged format"
        with patch.object(capsule, "fetch_releases", return_value=[release("0.14.4"), bad]), \
             patch.object(capsule, "chart_version_for") as chart, \
             patch.object(capsule, "update_compatibility_info") as update:
            with self.assertRaises(ValueError):
                capsule.scrape()
            chart.assert_not_called()
            update.assert_not_called()

    def test_shared_writer_preserves_metadata_and_records_chart_images(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "capsule.yaml"
            target.write_text(yaml.safe_dump({"icon": "capsule.png", "helm_repository_url": capsule.CHART_URL, "versions": []}))
            with patch.object(capsule, "TARGET_FILE", str(target)), \
                 patch.object(capsule, "fetch_releases", return_value=[release("0.14.4")]), \
                 patch.object(capsule, "chart_version_for", return_value="0.14.4"), \
                 patch("utils.get_chart_images", return_value=["ghcr.io/projectcapsule/capsule:0.14.4"]), \
                 patch("utils.summarization_enabled", return_value=False):
                capsule.scrape()
            output = yaml.safe_load(target.read_text())
            self.assertEqual(output["icon"], "capsule.png")
            self.assertEqual(output["versions"][0]["kube"], ["1.36"])
            self.assertEqual(output["versions"][0]["chart_version"], "0.14.4")
            self.assertEqual(output["versions"][0]["images"], ["ghcr.io/projectcapsule/capsule:0.14.4"])


if __name__ == "__main__":
    unittest.main()
