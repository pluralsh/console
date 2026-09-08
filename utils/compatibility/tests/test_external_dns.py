"""Offline tests for ExternalDNS compatibility and immutable image metadata."""
from copy import deepcopy
import hashlib
import importlib
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import requests
from packaging.version import Version

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.external-dns")
import utils
from utils import reduce_versions, update_versions_data
MATRIX = (Path(__file__).parent / "fixtures/external-dns/matrix.md").read_bytes()

def response(value):
    content = json.dumps(value, separators=(",", ":")).encode()
    return SimpleNamespace(content=content, headers={"Docker-Content-Digest": "sha256:" + hashlib.sha256(content).hexdigest()})

def release(version):
    return {"tag_name": "v" + version, "draft": False, "prerelease": False}

class ExternalDNSTests(unittest.TestCase):
    def setUp(self):
        self.existing = {"versions": [{"version": "0.21.0", "kube": ["1.36", "1.21", "1.19"],
            "chart_version": "1.21.1", "images": ["existing:0.21.0"],
            "requirements": [], "incompatibilities": [], "summary": {"features": ["Stored"]}}]}
        self.charts = {"0.21.0": "1.21.1"}
        self.sources = {scraper.releases_url: response([release("0.22.0"), release("0.21.0")]),
            scraper.matrix_url.format(version="0.22.0"): SimpleNamespace(content=MATRIX)}

    def run_scrape(self, failure=None, ceiling="1.36"):
        with patch.object(scraper, "read_yaml", return_value=self.existing), \
                patch.object(scraper, "_get", side_effect=lambda url, *args: self.sources[url]), \
                patch.object(scraper, "get_chart_versions", return_value=self.charts), \
                patch.object(scraper, "current_kube_version", return_value=ceiling), \
                patch.object(scraper, "verified_image", side_effect=failure,
                             return_value=scraper.image_name + ":v0.22.0@sha256:" + "a"*64) as image, \
                patch.object(scraper, "print_warning"), patch.object(scraper, "print_error"), \
                patch.object(scraper, "update_compatibility_info") as write:
            scraper.scrape()
        return write, image

    def save(self, rows):
        update_versions_data(self.existing, deepcopy(rows))
        self.existing["versions"] = reduce_versions(self.existing["versions"])

    def test_explicit_matrix_excludes_unsupported_kubernetes_and_caps_open_range(self):
        self.assertEqual(scraper.supported_kubernetes(MATRIX, "0.22.0", "1.36"),
                         [f"1.{i}" for i in range(36, 20, -1)])
        self.assertEqual(scraper.supported_kubernetes(MATRIX, "0.22.0", "1.21"), ["1.21"])
        self.assertEqual(scraper.supported_kubernetes(MATRIX, "0.17.0", "1.36"),
                         [f"1.{i}" for i in range(32, 18, -1)])

    def test_column_order_does_not_change_selected_support(self):
        lines = MATRIX.decode().splitlines()
        for i, line in enumerate(lines):
            if line.startswith("|"):
                cells = line.strip("|").split("|")
                cells[1], cells[-1] = cells[-1], cells[1]
                lines[i] = "|" + "|".join(cells) + "|"
        self.assertEqual(scraper.supported_kubernetes("\n".join(lines), "0.22.0", "1.36"),
                         scraper.supported_kubernetes(MATRIX, "0.22.0", "1.36"))

    def test_malformed_or_ambiguous_matrix_never_partially_parses(self):
        invalid = [b"Missing", MATRIX.replace(b"ExternalDNS", b"Ray"), MATRIX + MATRIX,
            MATRIX.replace(b":white_check_mark:", b"maybe", 1),
            MATRIX.replace("≥ 1.33".encode(), b"1.33+"),
            MATRIX.replace("≥ 1.22 and ≤ 1.32".encode(), "≥ 1.32 and ≤ 1.22".encode()),
            MATRIX.replace("≤ 0.9.x".encode(), "≥ 0.18.x".encode()),
            MATRIX.replace(b"| Kubernetes 1.21", b"| extra | Kubernetes 1.21")]
        for source in invalid:
            with self.subTest(source=source[:30]), self.assertRaises(ValueError):
                scraper.supported_kubernetes(source, "0.22.0", "1.36")

    def test_bad_release_or_ceiling_is_rejected(self):
        for version, cap in [("0.22.0-rc1", "1.36"), ("0.22", "1.36"), ("0.22.0", None),
                             ("0.22.0", "1.36+"), ("0.22.0", "2.0"), ("0.22.0", "1.20")]:
            with self.subTest(version=version, cap=cap), self.assertRaises(ValueError):
                scraper.supported_kubernetes(MATRIX, version, cap)

    def test_only_released_stable_apps_are_selected_and_deduplicated(self):
        data = [release("0.22.0"), release("0.22.0"), release("0.21.0"), release("0.22.1-rc1"),
                dict(release("0.23.0"), draft=True), dict(release("0.24.0"), prerelease=True),
                {"tag_name": "external-dns-helm-chart-1.22.0", "draft": False, "prerelease": False}]
        self.assertEqual(scraper.released_versions(json.dumps(data)), ["0.22.0"])
        for source in ("null", "{}", "[null]"):
            with self.assertRaises(ValueError):
                scraper.released_versions(source)

    def test_chartless_release_retains_verified_image_and_concrete_migration_notes(self):
        original = deepcopy(self.existing)
        row = self.run_scrape()[0].call_args.args[1][0]
        self.assertEqual(row["version"], "0.22.0")
        self.assertNotIn("chart_version", row)
        self.assertIn("@sha256:", row["images"][0])
        notes = " ".join(row["summary"]["breaking_changes"])
        for detail in ("--policy", "external-dns.alpha.kubernetes.io/", "Plural", "ns1", "hetzner", "alibaba"):
            self.assertIn(detail, notes)
        self.assertEqual(self.existing, original)

    def test_missing_registry_artifact_keeps_support_without_inventing_image(self):
        row = self.run_scrape(requests.HTTPError("404"))[0].call_args.args[1][0]
        self.assertEqual(row["images"], [])
        self.assertEqual(row["kube"][-1], "1.21")

    def test_completed_rerun_does_not_fetch_matrix_image_or_write(self):
        self.save(self.run_scrape()[0].call_args.args[1])
        self.sources = {scraper.releases_url: self.sources[scraper.releases_url]}
        write, image = self.run_scrape()
        write.assert_not_called()
        image.assert_not_called()

    def test_recorded_open_range_refreshes_new_ceiling_preserving_metadata_then_noops(self):
        self.save(self.run_scrape()[0].call_args.args[1])
        saved = self.existing["versions"][0]
        saved.update(eolAt="2027-01-01", requirements=[{"name": "keep", "version": "1.0"}])
        before = deepcopy(self.existing)
        # The release may already have fallen off the latest 100 release records.
        self.sources[scraper.releases_url] = response([])
        write, image = self.run_scrape(ceiling="1.37")
        rows = write.call_args.args[1]
        self.assertEqual(rows, [dict(saved, kube=["1.37"] + saved["kube"])])
        self.assertEqual(self.existing, before)
        image.assert_not_called()
        self.save(rows)
        self.assertEqual(self.existing["versions"][1], before["versions"][1])
        self.sources = {scraper.releases_url: response([])}
        self.run_scrape(ceiling="1.37")[0].assert_not_called()

    def test_ceiling_refresh_merges_a_simultaneous_exact_chart_backfill(self):
        self.save(self.run_scrape()[0].call_args.args[1])
        saved = deepcopy(self.existing["versions"][0])
        self.charts["0.22.0"] = "1.22.2"
        for old_chart in (None, "1.22.1"):
            with self.subTest(old_chart=old_chart):
                self.existing["versions"][0]["chart_version"] = old_chart
                rows = self.run_scrape(ceiling="1.37")[0].call_args.args[1]
                self.assertEqual(rows, [dict(saved, kube=["1.37"] + saved["kube"], chart_version="1.22.2")])
        self.save(rows)
        self.run_scrape(ceiling="1.37")[0].assert_not_called()

    def test_finite_matrix_range_does_not_extend_with_a_new_ceiling(self):
        self.save(self.run_scrape()[0].call_args.args[1])
        self.sources[scraper.matrix_url.format(version="0.22.0")] = SimpleNamespace(
            content=MATRIX.replace("≥ 1.33".encode(), "≥ 1.33 and ≤ 1.36".encode()))
        self.run_scrape(ceiling="1.37")[0].assert_not_called()

    def test_delayed_exact_chart_backfill_preserves_metadata_and_noops_next_run(self):
        self.save(self.run_scrape()[0].call_args.args[1])
        saved = self.existing["versions"][0]
        saved.update(eolAt="2027-01-01", requirements=[{"name": "keep", "version": "1.0"}])
        original = deepcopy(saved)
        self.charts["0.22.0"] = "1.22.2"
        self.sources = {scraper.releases_url: self.sources[scraper.releases_url]}
        write, image = self.run_scrape()
        self.assertEqual(write.call_args.args[1], [dict(original, chart_version="1.22.2")])
        image.assert_not_called()
        self.save(write.call_args.args[1])
        self.assertEqual(self.existing["versions"][0]["summary"]["helm_changes"],
                         "Application support is verified independently of Helm chart availability.")
        self.assertEqual(len(self.existing["versions"]), len({r["version"] for r in self.existing["versions"]}))
        self.run_scrape()[0].assert_not_called()

    def test_legacy_backfill_does_not_require_a_current_matrix_or_release_entry(self):
        self.save(self.run_scrape()[0].call_args.args[1])
        legacy = {"version": "0.8.0", "kube": ["1.15"], "images": ["old:0.8.0"],
                  "summary": {"features": ["Keep"]}, "eolAt": "2020-01-01"}
        self.existing["versions"].append(legacy)
        self.charts["0.8.0"] = "1.0.0"
        self.sources = {scraper.releases_url: response([])}
        for blank in (None, ""):
            legacy["chart_version"] = blank
            write, image = self.run_scrape()
            self.assertEqual(write.call_args.args[1], [dict(legacy, chart_version="1.0.0")])
            image.assert_not_called()

    def test_newer_exact_chart_preserves_metadata_refreshes_images_then_noops(self):
        self.save(self.run_scrape()[0].call_args.args[1])
        self.existing["helm_repository_url"] = "https://charts.example.test"
        legacy = self.existing["versions"][1]
        legacy.update(eolAt="2027-01-01", requirements=[{"name": "keep", "version": "1.0"}],
                      summary={"helm_changes": "Custom packaging notes", "features": ["Keep"]})
        before = deepcopy(self.existing)
        self.charts["0.21.0"] = "1.21.2"
        self.sources = {scraper.releases_url: response([])}
        write, image = self.run_scrape()
        changed = dict(legacy, chart_version="1.21.2")
        self.assertEqual(write.call_args.args[1], [changed])
        self.assertEqual(self.existing, before)
        image.assert_not_called()
        with patch.object(utils, "read_yaml", return_value=deepcopy(self.existing)), \
                patch.object(utils, "get_chart_images", return_value=["from-new-chart:0.21.0"]) as render, \
                patch.object(utils, "summarization_enabled", return_value=False), \
                patch.object(utils, "print_warning"), patch.object(utils, "print_success"), \
                patch.object(utils, "write_yaml", return_value=True) as persist:
            utils.update_compatibility_info(scraper.target_file, write.call_args.args[1])
        render.assert_called_once_with("https://charts.example.test", "external-dns", "1.21.2", None)
        self.existing = persist.call_args.args[1]
        self.assertEqual(self.existing["versions"][1], dict(changed, images=["from-new-chart:0.21.0"]))
        self.assertEqual(self.existing["versions"][0], before["versions"][0])
        self.run_scrape()[0].assert_not_called()
        self.charts["0.21.0"] = "1.21.1"
        self.run_scrape()[0].assert_not_called()

    def test_equal_older_and_nonstable_charts_are_not_used_as_updates(self):
        self.save(self.run_scrape()[0].call_args.args[1])
        self.charts["0.22.0"] = "1.22.0-rc1"
        for chart in ("1.21.1", "1.21.0", "1.22.0-rc1", "1.22", "invalid", None):
            with self.subTest(chart=chart):
                self.charts["0.21.0"] = chart
                self.run_scrape()[0].assert_not_called()

    def test_charted_intermediate_patch_is_retained_before_reduction(self):
        self.sources[scraper.releases_url] = response([release(f"0.22.{i}") for i in range(3)])
        for i in (1, 2):
            self.sources[scraper.matrix_url.format(version=f"0.22.{i}")] = SimpleNamespace(content=MATRIX)
        self.charts["0.22.1"] = "1.22.1"
        rows = self.run_scrape()[0].call_args.args[1]
        self.assertEqual({r["version"] for r in rows}, {"0.22.0", "0.22.1", "0.22.2"})
        self.assertEqual(next(r for r in rows if r["version"] == "0.22.1")["chart_version"], "1.22.1")

    def test_second_matrix_failure_aborts_entire_batch_before_image_reads(self):
        self.sources[scraper.releases_url] = response([release("0.22.1"), release("0.22.0")])
        self.sources[scraper.matrix_url.format(version="0.22.1")] = SimpleNamespace(content=MATRIX)
        self.sources[scraper.matrix_url.format(version="0.22.0")] = SimpleNamespace(content=b"Missing")
        write, image = self.run_scrape()
        write.assert_not_called()
        image.assert_not_called()

    def test_duplicate_existing_versions_fail_before_lossy_merge(self):
        self.existing["versions"].append(deepcopy(self.existing["versions"][0]))
        self.run_scrape()[0].assert_not_called()

    def test_mixed_chart_reducer_preserves_latest_available_chart_images_and_eol(self):
        rows = [{"version": "0.21.0", "kube": ["1.33"], "chart_version": "1.21.0"},
                {"version": "0.21.1", "kube": ["1.33"], "chart_version": "1.21.1", "eolAt": "2027-01-01"},
                {"version": "0.22.0", "kube": ["1.33"], "images": ["verified:0.22.0"]}]
        reduced = reduce_versions(rows)
        self.assertEqual([r["version"] for r in reduced], ["0.22.0", "0.21.1", "0.21.0"])
        self.assertEqual(reduced[0]["images"], ["verified:0.22.0"])
        self.assertEqual(reduced[1]["eolAt"], "2027-01-01")
        self.assertEqual(max(Version(r["chart_version"]) for r in reduced if r.get("chart_version")), Version("1.21.1"))

    def registry_artifacts(self, labels=None):
        config = response({"config": {"Labels": labels or {"org.opencontainers.image.source": "https://github.com/kubernetes-sigs/external-dns"}}})
        manifest = response({"schemaVersion": 2, "config": {"digest": config.headers["Docker-Content-Digest"]}})
        index = response({"schemaVersion": 2, "manifests": [{"platform": {"os": "linux", "architecture": "amd64"},
                                                          "digest": manifest.headers["Docker-Content-Digest"]}]})
        return index, manifest, config

    def test_registry_checks_index_platform_and_config_digests_without_image_layers(self):
        artifacts = self.registry_artifacts()
        with patch.object(scraper, "_get", side_effect=artifacts) as get:
            image = scraper.verified_image("0.22.0")
        self.assertEqual(image, scraper.image_name + ":v0.22.0@" + artifacts[0].headers["Docker-Content-Digest"])
        self.assertEqual(get.call_count, 3)
        self.assertEqual(get.call_args_list[0].args[1], {"Accept": scraper.manifest_accept})
        self.assertIn("/blobs/sha256:", get.call_args_list[-1].args[0])

    def test_registry_rejects_wrong_digest_version_source_or_missing_platform(self):
        cases = [self.registry_artifacts({"org.opencontainers.image.version": "v0.21.0"}),
                 self.registry_artifacts({"org.opencontainers.image.source": "https://example.com/other"})]
        broken = list(self.registry_artifacts())
        broken[-1].content += b" "
        cases.append(broken)
        broken = list(self.registry_artifacts())
        broken[0].headers["Docker-Content-Digest"] = "sha256:" + "0"*64
        cases.append(broken)
        cases.extend([[response(d)] for d in [
            {"schemaVersion": 2, "manifests": []}, {"schemaVersion": 2, "config": {}}, {"schemaVersion": 1}]])
        for artifacts in cases:
            with self.subTest(artifacts=artifacts), patch.object(scraper, "_get", side_effect=artifacts), self.assertRaises(ValueError):
                scraper.verified_image("0.22.0")

    def test_http_reads_have_timeout_and_raise_for_status(self):
        with patch.object(scraper.requests, "get") as get:
            scraper._get("https://example.com")
            get.assert_called_once_with("https://example.com", headers=None, timeout=30)
            get.return_value.raise_for_status.assert_called_once_with()

if __name__ == "__main__":
    unittest.main()
