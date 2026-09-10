"""Offline behavior tests: network and Helm boundaries only are substituted."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch
from copy import deepcopy

import yaml

COMPAT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPAT))
from scrapers import k8gb
import utils

FIXTURE = Path(__file__).parent / "fixtures/k8gb/index.yaml"


def archive(entry, **changes):
    metadata = {key: entry[key] for key in ("name", "version", "appVersion", "kubeVersion")}
    metadata.update(changes)
    body = yaml.safe_dump(metadata).encode()
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz") as tar:
        member = tarfile.TarInfo("k8gb/Chart.yaml")
        member.size = len(body)
        tar.addfile(member, io.BytesIO(body))
    return output.getvalue()


def entry(version="v1.0.0", floor=">= 1.21.0-0"):
    value = {"name": "k8gb", "version": version, "appVersion": version,
             "kubeVersion": floor, "urls": [f"charts/k8gb-{version}.tgz"]}
    body = archive(value)
    value["digest"] = hashlib.sha256(body).hexdigest()
    return value, body


def index(entries):
    return yaml.safe_dump({"entries": {"k8gb": entries}}).encode()


class K8GBTests(unittest.TestCase):
    def test_strict_stable_versions(self):
        self.assertEqual(k8gb.stable_version("v1.10.2"), (1, 10, 2))
        for value in (None, 1, "1.0", "01.0.0", "1.0.0-rc1", "1.0.0+build", "main", "next v1.0.0"):
            with self.subTest(value=value):
                self.assertIsNone(k8gb.stable_version(value))

    def test_floor_is_bounded_and_includes_equal_endpoint(self):
        self.assertEqual(k8gb.kube_minors(">= 1.34.0-0", "1.36"), ["1.36", "1.35", "1.34"])
        self.assertEqual(k8gb.kube_minors(">=1.36.0", "1.36"), ["1.36"])
        self.assertEqual(k8gb.kube_minors(">=1.37.0", "1.36"), [])

    def test_patch_bounds_and_complex_ranges_are_not_rounded(self):
        for requirement in (">=1.32.1", ">1.32.0", ">=1.32.0 <1.34", "^1.32.0", "1.32", "*", ""):
            with self.subTest(requirement=requirement):
                with self.assertRaises(ValueError):
                    k8gb.kube_minors(requirement, "1.36")
        with self.assertRaises(ValueError):
            k8gb.kube_minors(">=1.32.0", "1.36.1")

    def test_real_index_formats_and_legacy_exclusions(self):
        rows = k8gb.parse_index(FIXTURE.read_bytes(), "1.36")
        self.assertEqual([x["appVersion"] for x in rows], ["v1.0.0", "v0.14.0"])
        self.assertEqual(rows[0]["kube"][-1], "1.21")
        self.assertEqual(rows[1]["kube"][-1], "1.19")
        self.assertEqual(rows[0]["version"], "v1.0.0")
        self.assertEqual(rows[0]["download_url"], "https://www.k8gb.io/charts/k8gb-v1.0.0.tgz")

    def test_chart_selection_uses_numeric_versions_not_input_order(self):
        a, _ = entry(); b = dict(a, version="v2.0.0")
        c = dict(a, version="v10.0.0")
        for order in ([c,a,b], [a,b,c]):
            self.assertEqual(k8gb.parse_index(index(order), "1.36")[0]["version"], "v10.0.0")

    def test_deprecated_and_future_only_charts_are_not_promoted(self):
        a, _ = entry(); b, _ = entry("v2.0.0", ">=1.37.0")
        c, _ = entry("v3.0.0"); c["deprecated"] = True
        self.assertEqual(len(k8gb.parse_index(index([c,b,a]), "1.36")), 1)

    def test_conflicting_duplicate_chart_version_is_rejected(self):
        a, _ = entry(); b = dict(a, kubeVersion=">=1.32.0")
        with self.assertRaises(ValueError):
            k8gb.parse_index(index([a,b]), "1.36")
        self.assertEqual(len(k8gb.parse_index(index([a,a]), "1.36")), 1)

    def test_missing_metadata_or_external_url_cannot_become_a_row(self):
        a, _ = entry()
        for change in ({"digest":"bad"}, {"urls":[]}, {"urls":["http://www.k8gb.io/a"]},
                       {"urls":["https://example.com/a"]}, {"urls":["https://x@www.k8gb.io/a"]},
                       {"name":"other"}):
            with self.subTest(change=change):
                with self.assertRaises(ValueError):
                    k8gb.parse_index(index([dict(a, **change)]), "1.36")

    def test_empty_missing_or_nonstable_index_does_not_succeed(self):
        for content in (b"null", b"{}", index([]), index([entry("v1.0.0-rc1")[0]])):
            with self.subTest(content=content):
                with self.assertRaises(ValueError):
                    k8gb.parse_index(content, "1.36")

    def test_verified_archive_is_read_without_extraction(self):
        a, body = entry()
        k8gb.verify_chart(body, a)
        with self.assertRaises(ValueError):
            k8gb.verify_chart(body+b"x", a)

    def test_matching_digest_does_not_hide_chart_metadata_mismatch(self):
        a, _ = entry(); body = archive(a, appVersion="v2.0.0")
        a["digest"] = hashlib.sha256(body).hexdigest()
        with self.assertRaisesRegex(ValueError, "appVersion"):
            k8gb.verify_chart(body, a)

    def test_symlink_chart_metadata_is_rejected(self):
        a, _ = entry(); output = io.BytesIO()
        with tarfile.open(fileobj=output, mode="w:gz") as tar:
            m = tarfile.TarInfo("k8gb/Chart.yaml"); m.type = tarfile.SYMTYPE; m.linkname = "/etc/passwd"; tar.addfile(m)
        body = output.getvalue(); a["digest"] = hashlib.sha256(body).hexdigest()
        with self.assertRaises(ValueError):
            k8gb.verify_chart(body, a)

    def test_render_boundary_keeps_arguments_and_reads_real_yaml(self):
        result = subprocess.CompletedProcess([], 0, stdout="spec:\n  containers:\n    - image: example/k8gb:v1.0.0\n", stderr="")
        with patch.object(k8gb.subprocess, "run", return_value=result) as run:
            self.assertEqual(k8gb.chart_images(b"chart", "1.36"), ["example/k8gb:v1.0.0"])
            self.assertEqual(run.call_args.args[0][-2:], ["--kube-version", "1.36"])
            self.assertTrue(run.call_args.kwargs["check"])
            self.assertFalse(Path(run.call_args.args[0][3]).exists())

    def test_empty_render_is_an_error(self):
        result = subprocess.CompletedProcess([], 0, stdout="apiVersion: v1\nkind: ConfigMap\n", stderr="")
        with patch.object(k8gb.subprocess, "run", return_value=result):
            with self.assertRaises(ValueError):
                k8gb.chart_images(b"chart", "1.36")


class ScrapeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.file = Path(self.temp.name)/"k8gb.yaml"
        self.original = {"icon":"https://www.k8gb.io/images/k8gb-icon-color.svg", "helm_repository_url":k8gb.HELM_REPOSITORY, "versions":[]}
        self.file.write_text(yaml.safe_dump(self.original))
        self.before = self.file.read_bytes()
        a, body_a = entry(); b, body_b = entry("v0.14.0", ">=1.19.0-0")
        self.entries = [a,b]
        self.sources = {k8gb.INDEX_URL:index(self.entries), **{
            f"{k8gb.HELM_REPOSITORY}/charts/k8gb-{v['version']}.tgz":body
            for v,body in ((a,body_a),(b,body_b))}}
        self.results = subprocess.CompletedProcess([], 0, stdout="spec:\n  containers:\n    - image: example/k8gb:v1.0.0\n", stderr="")

    def execute(self, results=None):
        with patch.object(k8gb,"TARGET_FILE", str(self.file)), \
                patch.object(utils,"current_kube_version", return_value="1.36"), \
                patch.object(k8gb,"fetch_bytes", side_effect=self.sources.__getitem__), \
                patch.object(k8gb.subprocess,"run", side_effect=results) if results is not None else patch.object(k8gb.subprocess,"run", return_value=self.results):
            return k8gb.scrape()

    def test_real_writer_reducer_and_second_run_are_consistent(self):
        result = self.execute()
        self.assertEqual([r["version"] for r in result["versions"]], ["1.0.0", "0.14.0"])
        self.assertEqual(yaml.safe_load(self.file.read_text()), result)
        self.assertEqual(result["versions"][0]["chart_version"], "v1.0.0")
        self.assertEqual(result["icon"], self.original["icon"])
        once=self.file.read_bytes(); stamp=self.file.stat().st_mtime_ns
        self.assertEqual(self.execute(), result)
        self.assertEqual(self.file.read_bytes(), once)
        self.assertEqual(self.file.stat().st_mtime_ns, stamp)

    def test_second_render_failure_leaves_existing_file_unchanged(self):
        error = subprocess.CalledProcessError(1, ["helm"], stderr="bad chart")
        with self.assertRaises(subprocess.CalledProcessError):
            self.execute([self.results, error])
        self.assertEqual(self.file.read_bytes(), self.before)

    def test_second_archive_failure_leaves_existing_file_unchanged(self):
        self.sources[f"{k8gb.HELM_REPOSITORY}/charts/k8gb-v0.14.0.tgz"] = b"corrupt"
        with self.assertRaises(ValueError):
            self.execute()
        self.assertEqual(self.file.read_bytes(), self.before)

    def test_malformed_second_index_entry_leaves_file_unchanged(self):
        self.entries[1]["kubeVersion"] = ">=1.19.1"
        self.sources[k8gb.INDEX_URL] = index(self.entries)
        with self.assertRaises(ValueError):
            self.execute()
        self.assertEqual(self.file.read_bytes(), self.before)

    def test_existing_summary_is_preserved(self):
        self.original["versions"] = [{"version":"1.0.0","summary":{"features":["Existing note"]}}]
        self.file.write_text(yaml.safe_dump(self.original))
        self.assertEqual(self.execute()["versions"][0]["summary"], {"features":["Existing note"]})

    def test_missing_target_never_creates_a_metadata_less_table(self):
        self.file.unlink()
        with self.assertRaises(ValueError):
            self.execute()
        self.assertFalse(self.file.exists())


if __name__ == "__main__":
    unittest.main()
