"""Image extraction regressions from charts that also template CRD schemas."""

from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils import find_nested_images


class ChartImageTests(unittest.TestCase):
    def test_crd_image_schema_does_not_crash_or_hide_container_images(self):
        manifests = [
            {"kind": "CustomResourceDefinition", "spec": {"properties": {
                "image": {"description": "Container image", "type": "string"},
            }}},
            {"kind": "Deployment", "spec": {"template": {"spec": {
                "containers": [{"image": "ghcr.io/cloudnative-pg/cloudnative-pg:1.30.0"}],
                "initContainers": [{"image": "busybox:1.36"}],
            }}}},
        ]
        self.assertEqual(find_nested_images(manifests), [
            "busybox:1.36", "ghcr.io/cloudnative-pg/cloudnative-pg:1.30.0",
        ])

    def test_non_image_values_are_ignored_and_references_deduplicated(self):
        self.assertEqual(find_nested_images([
            {"image": None}, {"image": 123}, {"image": "not an image"},
            {"image": "registry.example:5000/operator:v1"},
            {"image": "registry.example:5000/operator:v1"},
            {"image": "registry.example/operator@sha256:" + "a" * 64},
        ]), ["registry.example/operator@sha256:" + "a" * 64, "registry.example:5000/operator:v1"])


if __name__ == "__main__":
    unittest.main()
