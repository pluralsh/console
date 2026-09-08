"""Regression coverage for image fields in Helm-rendered resources and CRDs."""

from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils import find_nested_images


class NestedImagesTests(unittest.TestCase):
    def test_crd_image_schema_does_not_hide_container_images(self):
        documents = [
            {
                "kind": "CustomResourceDefinition",
                "spec": {"versions": [{"schema": {"openAPIV3Schema": {
                    "properties": {"spec": {"properties": {
                        "image": {"description": "Container image", "type": "string"}
                    }}}
                }}}]},
            },
            {
                "kind": "Deployment",
                "spec": {"template": {"spec": {
                    "initContainers": [{"image": "registry.example/init:v1"}],
                    "containers": [
                        {"image": "registry.example/controller:v1"},
                        {"image": "registry.example/controller:v1"},
                    ],
                }}},
            },
        ]
        self.assertEqual(find_nested_images(documents), [
            "registry.example/controller:v1", "registry.example/init:v1"
        ])

    def test_structured_image_values_are_walked_for_nested_image_fields(self):
        documents = [
            {"image": {"container": {"image": "registry.example/dict:v1"}}},
            {"image": [{"image": "registry.example/list:v1"}, "not-an-image-field"]},
        ]
        self.assertEqual(find_nested_images(documents), [
            "registry.example/dict:v1", "registry.example/list:v1"
        ])

    def test_non_string_image_scalars_are_ignored(self):
        documents = [{"image": value} for value in [None, False, 42, 1.5]]
        self.assertEqual(find_nested_images(documents), [])


if __name__ == "__main__":
    unittest.main()
