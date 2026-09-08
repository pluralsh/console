import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import yaml


COMPATIBILITY = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).parent / "fixtures/knative_operator"
ROOT = COMPATIBILITY.parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


knative = load_module("knative_recorded", COMPATIBILITY / "scrapers/knative-operator.py")


class RecordedSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        history = dict(knative.parse_kubernetes_release(record, record["tag_name"])
                       for record in json.loads((FIXTURES / "kubernetes-ga-releases.json").read_text()))
        cls.versions = knative.build_versions(
            (FIXTURES / "release-schedule.md").read_text(),
            (FIXTURES / "operator-index.yaml").read_text(), history,
        )

    def test_covers_all_recorded_stable_charts_and_historical_cutoffs(self):
        self.assertEqual(len(self.versions), 83)
        self.assertEqual(self.versions[0]["version"], "1.23.1")
        self.assertEqual(self.versions[-1]["version"], "1.11.2")
        by_version = {row["version"]: row for row in self.versions}
        self.assertEqual(by_version["1.18.0"]["kube"], ["1.32", "1.31"])
        self.assertEqual(by_version["1.16.6"]["kube"], ["1.31", "1.30", "1.29"])
        self.assertFalse(any("1.37" in row["kube"] for row in self.versions))

    def test_shared_updater_preserves_metadata_and_is_idempotent(self):
        # Isolate optional summaries and Helm; exercise the actual merge/reducer/writer.
        summarizer = SimpleNamespace(helm_summary=lambda *args: None, summarization_enabled=lambda: False)
        with patch.dict(sys.modules, {"summarizer": summarizer}):
            shared = load_module("knative_shared_utils", COMPATIBILITY / "utils.py")
        table = yaml.safe_load((ROOT / "static/compatibilities/knative-operator.yaml").read_text())
        self.assertEqual(table["versions"], shared.reduce_versions(self.versions))
        metadata = {key: value for key, value in table.items() if key != "versions"}
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "knative-operator.yaml"
            shared.write_yaml(str(target), table)
            with patch.object(shared, "get_chart_images", return_value=[]), patch("builtins.print"):
                shared.update_compatibility_info(str(target), self.versions)
                first = target.read_bytes()
                shared.update_compatibility_info(str(target), self.versions)
            updated = yaml.safe_load(first)
            self.assertEqual(target.read_bytes(), first)
            self.assertEqual({key: value for key, value in updated.items() if key != "versions"}, metadata)
            self.assertEqual(updated["versions"], shared.reduce_versions(self.versions))


if __name__ == "__main__":
    unittest.main()
