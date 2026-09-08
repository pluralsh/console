import unittest

from utils import find_nested_images


class ChartImageTests(unittest.TestCase):
    def test_schema_image_properties_do_not_crash_extraction(self):
        objects = [
            {"schema": {"properties": {"image": {"type": "string"}}}},
            {"spec": {"containers": [
                {"image": "registry.k8s.io/kueue/kueue:v0.19.3"},
                {"image": "registry.k8s.io/kueue/kueue:v0.19.3"},
            ]}},
        ]
        self.assertEqual(find_nested_images(objects),
                         ["registry.k8s.io/kueue/kueue:v0.19.3"])

    def test_non_string_fields_are_traversed_without_becoming_image_references(self):
        objects = [
            {"image": None}, {"image": 42}, {"image": False},
            {"image": [{"image": "example.com/controller:1.0"}]},
        ]
        self.assertEqual(find_nested_images(objects), ["example.com/controller:1.0"])


if __name__ == "__main__":
    unittest.main()
