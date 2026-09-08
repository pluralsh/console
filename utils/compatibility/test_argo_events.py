import importlib
import os
import unittest
import yaml


class TestArgoEventsCompatibility(unittest.TestCase):
    def setUp(self):
        self.base_dir = os.path.dirname(__file__)
        self.repo_root = os.path.abspath(os.path.join(self.base_dir, "../.."))
        self.yaml_path = os.path.join(
            self.repo_root, "static", "compatibilities", "argo-events.yaml"
        )
        self.manifest_path = os.path.join(
            self.repo_root, "static", "compatibilities", "manifest.yaml"
        )

    def test_scraper_module_loads(self):
        """Test that argo-events scraper can be loaded dynamically by main.py."""
        mod = importlib.import_module("scrapers.argo-events")
        self.assertTrue(hasattr(mod, "scrape"))
        self.assertEqual(mod.app_name, "argo-events")
        self.assertEqual(mod.github_repo_owner, "argoproj")
        self.assertEqual(mod.github_repo_name, "argo-events")

    def test_manifest_registered(self):
        """Test that argo-events is registered in manifest.yaml."""
        with open(self.manifest_path, "r", encoding="utf-8") as f:
            manifest = yaml.safe_load(f)
        self.assertIn("argo-events", manifest.get("names", []))

    def test_argo_events_yaml_structure(self):
        """Test that argo-events.yaml exists and has valid required fields."""
        self.assertTrue(
            os.path.exists(self.yaml_path),
            f"Missing compatibility file: {self.yaml_path}",
        )
        with open(self.yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        self.assertIn("icon", data)
        self.assertIn("git_url", data)
        self.assertIn("release_url", data)
        self.assertIn("helm_repository_url", data)
        self.assertIn("versions", data)

        self.assertEqual(
            data["git_url"], "https://github.com/argoproj/argo-events"
        )
        self.assertEqual(
            data["helm_repository_url"], "https://argoproj.github.io/argo-helm"
        )
        self.assertGreater(
            len(data["versions"]),
            0,
            "Expected at least one version entry in argo-events.yaml",
        )

        # Validate entries
        for entry in data["versions"]:
            self.assertIn("version", entry)
            self.assertIn("kube", entry)
            self.assertIn("chart_version", entry)
            self.assertIn("images", entry)
            self.assertIsInstance(entry["kube"], list)
            self.assertIsInstance(entry["images"], list)
            self.assertGreater(len(entry["kube"]), 0)


if __name__ == "__main__":
    unittest.main()
