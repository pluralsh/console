"""Image discovery must tolerate YAML aliases without losing neighboring images."""

from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils import find_nested_images


class RecursiveChartImageTests(unittest.TestCase):
    def test_recursive_embedded_mapping_keeps_its_image_and_valid_neighbor(self):
        configmap = {"kind": "ConfigMap", "data": {"server.yaml": (
            "apiVersion: policies.kubewarden.io/v1\n"
            "kind: PolicyServer\n"
            "spec: &server\n"
            "  image: registry.example/policy-server:v1\n"
            "  recursive: *server\n"
        )}}
        neighbor = {"spec": {"containers": [{"image": "nginx:1.27"}]}}
        self.assertEqual(find_nested_images([configmap, neighbor]), [
            "nginx:1.27", "registry.example/policy-server:v1",
        ])

    def test_recursive_embedded_sequence_keeps_its_image_and_valid_neighbor(self):
        configmap = {"kind": "ConfigMap", "data": {"pod.yaml": (
            "apiVersion: v1\nkind: Pod\n"
            "spec:\n"
            "  containers: &containers\n"
            "    - image: registry.example/worker:v1\n"
            "    - *containers\n"
        )}}
        neighbor = {"spec": {"initContainers": [{"image": "busybox:1.37"}]}}
        self.assertEqual(find_nested_images([configmap, neighbor]), [
            "busybox:1.37", "registry.example/worker:v1",
        ])

    def test_shared_aliases_preserve_unique_images_across_documents(self):
        configmap = {"kind": "ConfigMap", "data": {"pods.yml": (
            "apiVersion: v1\nkind: Pod\n"
            "spec:\n"
            "  initContainers: &shared\n"
            "    - image: busybox:1.37\n"
            "  containers: *shared\n"
            "---\n"
            "apiVersion: v1\nkind: Pod\n"
            "spec:\n"
            "  containers: &shared\n"
            "    - image: nginx:1.27\n"
            "  repeated: *shared\n"
        )}}
        self.assertEqual(find_nested_images(configmap), ["busybox:1.37", "nginx:1.27"])

    def test_separately_parsed_embedded_manifests_do_not_lose_images(self):
        resources = []
        expected = []
        for index in range(64):
            reference = f"registry.example/worker:v{index}"
            expected.append(reference)
            resources.append({"kind": "ConfigMap", "data": {"pod.yaml": (
                "apiVersion: v1\nkind: Pod\n"
                f"spec:\n  containers:\n    - image: {reference}\n"
            )}})
        self.assertEqual(find_nested_images(resources), sorted(expected))


if __name__ == "__main__":
    unittest.main()
