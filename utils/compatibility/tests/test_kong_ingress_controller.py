import hashlib
import importlib
import io
from pathlib import Path
import sys
import tarfile
import unittest
from unittest.mock import patch

import requests
import yaml


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.kong-ingress-controller")


def table(product, versions, compatible_versions):
    return "{% version_compatibility_table %}\n" + yaml.safe_dump({
        "compatible_product": product,
        "versions": versions,
        "compatible_versions": compatible_versions,
    }) + "{% endversion_compatibility_table %}"


MATRIX = "\n".join([
    table("Gateway", ["3.4"], {"3.9.x": ["3.4"]}),
    table("Kubernetes", ["3.4", "3.5"], {
        "1.30": ["3.4", "3.5"], "1.29": ["3.4"], "1.31": ["3.5", "3.5"],
    }),
    table("Gateway API", ["3.4"], {"1.2": ["3.4"]}),
    table("Istio", ["3.4"], {"1.26": ["3.4"]}),
])


def archive(tag, override=None):
    files = {
        "ingress/Chart.yaml": {"appVersion": "9.9.9"},
        "ingress/charts/kong/values.yaml": {
            "ingressController": {"image": {
                "repository": "kong/kubernetes-ingress-controller", "tag": tag,
            }},
        },
        "ingress/values.yaml": {"controller": {"ingressController": {"image": override or {}}}},
    }
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz") as tar:
        for name, value in files.items():
            data = yaml.safe_dump(value).encode()
            member = tarfile.TarInfo(name)
            member.size = len(data)
            tar.addfile(member, io.BytesIO(data))
    return output.getvalue()


class KongScraperTests(unittest.TestCase):
    def test_selects_only_explicit_kubernetes_combinations(self):
        self.assertEqual(scraper.parse_matrix(MATRIX), {
            "3.4": {"1.29", "1.30"}, "3.5": {"1.30", "1.31"},
        })

    def test_missing_duplicate_empty_or_invalid_matrix_fails(self):
        invalid = [
            "", MATRIX + MATRIX,
            table("Kubernetes", ["3.5"], {}),
            table("Kubernetes", ["3.5"], {"1.30": ["3.6"]}),
            table("Kubernetes", ["3.5"], {"1.30": "3.5"}),
            table("Kubernetes", ["3.5"], {"1.30+": ["3.5"]}),
        ]
        for markdown in invalid:
            with self.subTest(markdown=markdown), self.assertRaises(ValueError):
                scraper.parse_matrix(markdown)

    def test_chart_uses_controller_tag_and_parent_override(self):
        self.assertEqual(scraper.controller_minor(archive("3.4")), "3.4")
        self.assertEqual(scraper.controller_minor(archive("3.4", {"tag": "3.5.2"})), "3.5")

    def test_chart_rejects_unrelated_or_unstable_images(self):
        for image in [{"repository": "kong/gateway"}, {"tag": "latest"}, {"tag": "3.5.0-rc.1"}]:
            with self.subTest(image=image), self.assertRaises(ValueError):
                scraper.controller_minor(archive("3.4", image))

    def test_chart_mapping_uses_semantic_order_and_checks_digest(self):
        payload = archive("3.5")
        digest = hashlib.sha256(payload).hexdigest()
        entries = [{"version": version, "urls": [f"ingress-{version}.tgz"], "digest": digest}
                   for version in ["0.9.0", "0.10.0", "0.11.0-rc.1"]]
        index = yaml.safe_dump({"entries": {"ingress": entries}}).encode()
        with patch.object(scraper, "fetch", side_effect=[index, payload]) as fetch:
            self.assertEqual(scraper.chart_versions({"3.5"}), {"3.5": "0.10.0"})
            self.assertEqual(fetch.call_args_list[1].args[0], "https://charts.konghq.com/ingress-0.10.0.tgz")
        with patch.object(scraper, "fetch", side_effect=[index, b"corrupt archive"]):
            with self.assertRaisesRegex(ValueError, "digest mismatch"):
                scraper.chart_versions({"3.5"})

    def test_empty_chart_index_fails(self):
        index = yaml.safe_dump({"entries": {"ingress": []}}).encode()
        with patch.object(scraper, "fetch", return_value=index):
            with self.assertRaisesRegex(ValueError, "no stable ingress charts"):
                scraper.chart_versions({"3.5"})

    def test_scrape_passes_minor_boundaries_and_keeps_unmapped_compatibility(self):
        with patch.object(scraper, "fetch", return_value=MATRIX.encode()), \
                patch.object(scraper, "chart_versions", return_value={"3.5": "0.24.0"}), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/kong-ingress-controller.yaml")
        self.assertEqual(rows, [
            {"version": "3.5.0", "kube": ["1.31", "1.30"], "requirements": [],
             "incompatibilities": [], "chart_version": "0.24.0"},
            {"version": "3.4.0", "kube": ["1.30", "1.29"], "requirements": [],
             "incompatibilities": []},
        ])

    def test_source_failure_does_not_write_a_partial_table(self):
        for error in [ValueError("bad source"), requests.HTTPError("503")]:
            with self.subTest(error=error), \
                    patch.object(scraper, "fetch", side_effect=error), \
                    patch.object(scraper, "update_compatibility_info") as update:
                with self.assertRaises(type(error)):
                    scraper.scrape()
                update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
