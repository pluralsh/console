"""Image discovery must distinguish rendered CRD schemas from pod images."""

from pathlib import Path
import sys
import unittest

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils import find_nested_images


class ChartImageTests(unittest.TestCase):
    def test_rendered_emqx_schema_and_container_images(self):
        fixture = Path(__file__).parent / "fixtures/chart-images/emqx-operator-2.3.2.yaml"
        objects = list(yaml.safe_load_all(fixture.read_text()))
        self.assertEqual(find_nested_images(objects), [
            "alpine/k8s:1.31.4",
            "ghcr.io/emqx/emqx-operator:2.3.2",
        ])

    def test_non_string_image_fields_are_traversed_without_becoming_images(self):
        objects = {"image": [
            {"image": {"type": "string", "properties": {"image": {"type": "object"}}}},
            {"image": "ghcr.io/emqx/emqx-operator:2.3.2"},
            {"image": None},
            {"image": 42},
        ]}
        self.assertEqual(find_nested_images(objects), ["ghcr.io/emqx/emqx-operator:2.3.2"])

    def test_invalid_image_strings_and_unrelated_values_are_not_included(self):
        objects = [
            {"image": "https://example.com/logo.svg"},
            {"image": "not an image reference"},
            {"image": ""},
            {"description": "ghcr.io/emqx/emqx-operator:2.3.2"},
            {"image": "alpine/k8s:1.31.4"},
            {"image": "alpine/k8s:1.31.4"},
        ]
        self.assertEqual(find_nested_images(objects), ["alpine/k8s:1.31.4"])


if __name__ == "__main__":
    unittest.main()
