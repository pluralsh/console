from __future__ import annotations

import importlib.util
import sys
import tarfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch


COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = COMPATIBILITY_DIR / "scrapers" / "openbao.py"
sys.path.insert(0, str(COMPATIBILITY_DIR))

utils_spec = importlib.util.spec_from_file_location("utils", COMPATIBILITY_DIR / "utils.py")
compat_utils = importlib.util.module_from_spec(utils_spec)
assert utils_spec.loader is not None
utils_spec.loader.exec_module(compat_utils)

utils_module = sys.modules.get("utils")
if utils_module is None:
    sys.modules["utils"] = compat_utils
else:
    for name in (
        "current_kube_version",
        "fetch_page",
        "print_error",
        "update_compatibility_info",
        "validate_semver",
    ):
        setattr(utils_module, name, getattr(compat_utils, name))

spec = importlib.util.spec_from_file_location("openbao", MODULE_PATH)
openbao = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(openbao)


class OpenBaoScraperTest(unittest.TestCase):
    def test_parse_kube_constraint_expands_minimum_to_current_kubernetes(self):
        self.assertEqual(
            openbao.parse_kube_constraint(">= 1.30.0-0", "1.36"),
            ["1.30", "1.31", "1.32", "1.33", "1.34", "1.35", "1.36"],
        )

    def test_parse_kube_constraint_honors_upper_boundaries(self):
        self.assertEqual(
            openbao.parse_kube_constraint(">=1.27.0-0 <1.31.0-0", "1.36"),
            ["1.27", "1.28", "1.29", "1.30"],
        )

    def test_parse_kube_constraint_keeps_patch_overlap_within_minor(self):
        self.assertEqual(
            openbao.parse_kube_constraint(">1.29.0 <=1.31.0", "1.36"),
            ["1.29", "1.30", "1.31"],
        )

    def test_extract_rows_uses_stable_versions_and_latest_chart_patch(self):
        index_yaml = {
            "entries": {
                "openbao": [
                    {
                        "version": "0.29.4",
                        "appVersion": "v2.6.2",
                        "kubeVersion": ">= 1.30.0-0",
                        "urls": ["openbao-0.29.4.tgz"],
                    },
                    {
                        "version": "0.29.1",
                        "appVersion": "v2.6.1",
                        "kubeVersion": ">= 1.30.0-0",
                        "urls": ["openbao-0.29.1.tgz"],
                    },
                    {
                        "version": "0.29.0-beta",
                        "appVersion": "v2.6.1-beta",
                        "kubeVersion": ">= 1.30.0-0",
                        "urls": ["openbao-0.29.0-beta.tgz"],
                    },
                    {
                        "version": "0.28.1",
                        "appVersion": "v2.5.0",
                        "kubeVersion": ">= 1.29.0-0",
                        "urls": ["openbao-0.28.1.tgz"],
                    },
                    {
                        "version": "0.27.0",
                        "appVersion": "v2.4.0",
                        "kubeVersion": ">= 1.29.0-0",
                        "urls": ["openbao-0.27.0.tgz"],
                    },
                    {
                        "version": "0.26.0",
                        "appVersion": "v2.3.2",
                        "kubeVersion": "",
                        "urls": ["openbao-0.26.0.tgz"],
                    },
                ],
                "openbao-crds": [
                    {
                        "version": "0.29.4",
                        "appVersion": "v2.6.2",
                        "kubeVersion": ">= 1.30.0-0",
                        "urls": ["openbao-crds-0.29.4.tgz"],
                    }
                ],
            }
        }
        chart = self._chart_with_values(
            """
server:
  image:
    registry: quay.io
    repository: openbao/openbao
    tag: ""
injector:
  image:
    registry: docker.io
    repository: hashicorp/vault-k8s
    tag: 1.7.2
"""
        )

        with patch.object(openbao, "fetch_page", return_value=chart):
            rows = openbao.extract_rows(index_yaml, "1.36")

        self.assertEqual(
            [row["version"] for row in rows],
            ["2.6.2", "2.5.0", "2.4.0"],
        )
        self.assertEqual(
            [row["chart_version"] for row in rows],
            ["0.29.4", "0.28.1", "0.27.0"],
        )
        self.assertEqual(rows[0]["kube"], ["1.30", "1.31", "1.32", "1.33", "1.34", "1.35", "1.36"])
        self.assertEqual(
            rows[0]["images"],
            ["docker.io/hashicorp/vault-k8s:1.7.2", "quay.io/openbao/openbao:2.6.2"],
        )
        self.assertEqual(rows[1]["kube"][0], "1.29")

    def test_load_index_rejects_non_mapping_yaml(self):
        with patch.object(openbao, "print_error"):
            self.assertIsNone(openbao.load_index("- just\n- a\n- list\n"))

    def test_extract_default_images_reads_server_and_injector_defaults(self):
        chart = self._chart_with_values(
            """
server:
  image:
    registry: quay.io
    repository: openbao/openbao
    tag: ""
injector:
  image:
    repository: hashicorp/vault-k8s
    tag: 1.7.2
"""
        )

        self.assertEqual(
            openbao.extract_default_images(chart, "2.6.2"),
            ["docker.io/hashicorp/vault-k8s:1.7.2", "quay.io/openbao/openbao:2.6.2"],
        )

    def test_extract_default_images_fails_closed_on_bad_archive(self):
        self.assertEqual(openbao.extract_default_images(b"not a chart", "2.6.2"), [])

    def test_extract_default_images_ignores_unexpected_values_yaml(self):
        for values in ("", "- just\n- a\n- list\n", "server:\n"):
            with self.subTest(values=values):
                chart = self._chart_with_values(values)

                self.assertEqual(openbao.extract_default_images(chart, "2.6.2"), [])

    def test_extract_default_images_ignores_null_image_sections(self):
        chart = self._chart_with_values(
            """
server: null
injector:
  image: null
"""
        )

        self.assertEqual(openbao.extract_default_images(chart, "2.6.2"), [])

    def test_extract_rows_keeps_row_when_chart_download_fails(self):
        index_yaml = {
            "entries": {
                "openbao": [
                    {
                        "version": "0.29.4",
                        "appVersion": "v2.6.2",
                        "kubeVersion": ">= 1.30.0-0",
                        "urls": ["openbao-0.29.4.tgz"],
                    }
                ],
            }
        }

        with (
            patch.object(openbao, "fetch_page", side_effect=RuntimeError("timeout")),
            patch.object(openbao, "print_error") as print_error,
        ):
            rows = openbao.extract_rows(index_yaml, "1.36")

        self.assertEqual([row["version"] for row in rows], ["2.6.2"])
        self.assertEqual(rows[0]["images"], [])
        print_error.assert_called_once()

    def _chart_with_values(self, values):
        output = BytesIO()
        with tarfile.open(fileobj=output, mode="w:gz") as archive:
            encoded = values.encode("utf-8")
            info = tarfile.TarInfo("openbao/values.yaml")
            info.size = len(encoded)
            archive.addfile(info, BytesIO(encoded))
        return output.getvalue()


if __name__ == "__main__":
    unittest.main()
