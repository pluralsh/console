import importlib.util
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
from urllib.error import URLError


MODULE_PATH = Path(__file__).resolve().parents[1] / "scrapers/knative-operator.py"
spec = importlib.util.spec_from_file_location("knative_operator_adapter", MODULE_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

SCHEDULE = """
| Release | Date | Min K8s Version |
| --- | --- | --- |
| 1.23 | 2026-07-28 | 1.34 |
"""
INDEX = """
entries:
  knative-operator:
  - version: v1.23.1
    appVersion: 1.23.1
"""


class ScrapeTests(unittest.TestCase):
    def setUp(self):
        self.helper = SimpleNamespace(update_compatibility_info=Mock(), print_error=Mock())
        self.responses = {
            scraper.SCHEDULE_URL: SCHEDULE,
            scraper.INDEX_URL: INDEX,
            scraper.KUBERNETES_STABLE_URL: "v1.37.0\n",
        }
        for minor, published in [
            (34, "2025-08-27"), (35, "2025-12-17"),
            (36, "2026-04-22"), (37, "2026-08-26"),
        ]:
            tag = f"v1.{minor}.0"
            self.responses[f"https://api.github.com/repos/kubernetes/kubernetes/releases/tags/{tag}"] = json.dumps({
                "tag_name": tag, "draft": False, "prerelease": False,
                "published_at": published + "T12:00:00Z",
            })

    def test_updates_only_after_complete_source_validation(self):
        with patch.dict(sys.modules, {"utils": self.helper}), patch.object(
            scraper, "fetch_text", side_effect=self.responses.__getitem__,
        ):
            scraper.scrape()
        self.helper.print_error.assert_not_called()
        self.helper.update_compatibility_info.assert_called_once_with(scraper.TARGET_FILE, [{
            "version": "1.23.1", "chart_version": "v1.23.1",
            "kube": ["1.36", "1.35", "1.34"], "requirements": [], "incompatibilities": [],
        }])

    def test_fetch_failure_preserves_existing_table(self):
        with patch.dict(sys.modules, {"utils": self.helper}), patch.object(
            scraper, "fetch_text", side_effect=URLError("upstream unavailable"),
        ):
            scraper.scrape()
        self.helper.update_compatibility_info.assert_not_called()
        self.helper.print_error.assert_called_once()

    def test_incomplete_ga_source_preserves_existing_table(self):
        self.responses["https://api.github.com/repos/kubernetes/kubernetes/releases/tags/v1.35.0"] = "{}"
        with patch.dict(sys.modules, {"utils": self.helper}), patch.object(
            scraper, "fetch_text", side_effect=self.responses.__getitem__,
        ):
            scraper.scrape()
        self.helper.update_compatibility_info.assert_not_called()
        self.helper.print_error.assert_called_once()

    def test_malformed_stable_marker_preserves_existing_table(self):
        self.responses[scraper.KUBERNETES_STABLE_URL] = "v1.99.0-alpha.1"
        with patch.dict(sys.modules, {"utils": self.helper}), patch.object(
            scraper, "fetch_text", side_effect=self.responses.__getitem__,
        ):
            scraper.scrape()
        self.helper.update_compatibility_info.assert_not_called()
        self.helper.print_error.assert_called_once()


if __name__ == "__main__":
    unittest.main()
