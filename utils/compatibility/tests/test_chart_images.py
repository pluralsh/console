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

    def test_crd_image_schema_is_not_a_container_image(self):
        # Reduced shape that caused Kubewarden chart rendering to crash: the
        # CRD declares a field named image whose value is a schema dictionary.
        crd = {
            "kind": "CustomResourceDefinition",
            "spec": {"versions": [{"schema": {"openAPIV3Schema": {
                "properties": {"spec": {"properties": {"image": {
                    "description": "Container image used by the policy server",
                    "type": "string",
                }}}},
            }}}]},
        }
        server = {"kind": "PolicyServer", "spec": {"image": "ghcr.io/kubewarden/policy-server:v1.37.0"}}
        self.assertEqual(find_nested_images([crd, server]), ["ghcr.io/kubewarden/policy-server:v1.37.0"])

    def test_non_string_image_values_do_not_crash_or_hide_valid_neighbors(self):
        for invalid in ({"type": "string"}, ["not-an-image-value"], None, False, True, 7, 1.5):
            with self.subTest(image=invalid):
                resource = {"image": invalid, "child": {"image": "registry.example.com/app:1.2.3"}}
                self.assertEqual(find_nested_images(resource), ["registry.example.com/app:1.2.3"])

    def test_discovers_pod_init_container_and_policy_server_images(self):
        resources = [
            {"kind": "Pod", "spec": {
                "initContainers": [{"name": "prepare", "image": "busybox:1.37"}],
                "containers": [{"name": "controller", "image": "ghcr.io/kubewarden/controller:v1.37.2"}],
            }},
            {"kind": "PolicyServer", "spec": {"image": "ghcr.io/kubewarden/policy-server:v1.37.0"}},
        ]
        self.assertEqual(find_nested_images(resources), [
            "busybox:1.37",
            "ghcr.io/kubewarden/controller:v1.37.2",
            "ghcr.io/kubewarden/policy-server:v1.37.0",
        ])

    def test_deduplicates_tag_and_digest_images_without_collecting_unrelated_strings(self):
        digest = "registry.example.com:5000/team/app@sha256:" + "a" * 64
        resources = [
            {"image": digest}, {"image": digest},
            {"image": "nginx:1.27"}, {"nested": [{"image": "nginx:1.27"}]},
            {"ghcr.io/not-a-runtime-image:v1": "ghcr.io/not-an-image-field:v2"},
            {"description": "redis:7.4"},
        ]
        self.assertEqual(find_nested_images(resources), ["nginx:1.27", digest])

    def test_invalid_image_strings_are_rejected(self):
        invalid = [
            "", " ", "not an image", "https://example.com/image.png",
            "${IMAGE}", "<image>", "-placeholder", "_placeholder",
            "image@sha256:abc", "repo:tag extra",
        ]
        resources = [{"image": value} for value in invalid] + [{"image": "docker.io/library/nginx:1.27"}]
        self.assertEqual(find_nested_images(resources), ["docker.io/library/nginx:1.27"])

    def test_embedded_default_policy_server_manifest_retains_its_image(self):
        # Reduced from admission-controller 6.0.2's rendered kubewarden-defaults
        # ConfigMap, including its actual image reference and data key.
        configmap = {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "metadata": {"name": "kubewarden-defaults"},
            "data": {"policyserver-default.yaml": (
                "apiVersion: policies.kubewarden.io/v1\n"
                "kind: PolicyServer\n"
                "metadata:\n  name: default\n"
                "spec:\n  image: ghcr.io/kubewarden/adm-controller/policy-server:v1.37.2\n"
                "  replicas: 1\n"
            )},
        }
        self.assertEqual(find_nested_images(configmap), ["ghcr.io/kubewarden/adm-controller/policy-server:v1.37.2"])

    def test_embedded_multiple_documents_and_regular_images_are_deduplicated(self):
        configmap = {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "data": {"resources.yml": (
                "---\n"
                "apiVersion: v1\nkind: Pod\nspec:\n  containers:\n    - image: nginx:1.27\n"
                "---\n"
                "apiVersion: policies.kubewarden.io/v1\nkind: PolicyServer\n"
                "spec:\n  image: ghcr.io/kubewarden/adm-controller/policy-server:v1.37.2\n"
                "---\n"
            )},
        }
        self.assertEqual(find_nested_images([configmap, {"image": "nginx:1.27"}]), [
            "ghcr.io/kubewarden/adm-controller/policy-server:v1.37.2", "nginx:1.27",
        ])

    def test_malformed_or_nonmanifest_config_is_ignored(self):
        invalid = [
            None, False, "[", "null", "plain configuration text",
            "image: redis:7.4\n",
            "apiVersion: v1\nimage: redis:7.4\n",
            "kind: Pod\nimage: redis:7.4\n",
            "apiVersion: null\nkind: Pod\nimage: redis:7.4\n",
            "apiVersion: v1\nkind: []\nimage: redis:7.4\n",
            "- apiVersion: v1\n  kind: Pod\n  image: redis:7.4\n",
            "apiVersion: v1\nkind: Pod\nimage: redis:7.4\n---\n[",
        ]
        for content in invalid:
            with self.subTest(content=content):
                configmap = {"kind": "ConfigMap", "data": {"config.yaml": content}}
                self.assertEqual(find_nested_images([configmap, {"image": "nginx:1.27"}]), ["nginx:1.27"])

    def test_manifest_text_is_only_parsed_in_configmap_yaml_entries(self):
        content = "apiVersion: v1\nkind: Pod\nspec:\n  containers:\n    - image: redis:7.4\n"
        resources = [
            {"kind": "Secret", "data": {"resource.yaml": content}},
            {"kind": "ConfigMap", "data": {"resource.txt": content}},
            {"kind": "ConfigMap", "metadata": {"resource.yaml": content}},
            {"kind": "ConfigMap", "data": content},
            {"data": {"resource.yaml": content}},
            {"image": "nginx:1.27"},
        ]
        self.assertEqual(find_nested_images(resources), ["nginx:1.27"])


if __name__ == "__main__":
    unittest.main()
