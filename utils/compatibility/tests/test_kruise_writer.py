"""Offline integration with the real compatibility writer; no Helm or AI calls."""

import contextlib
import copy
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import utils


class KruiseWriterTests(unittest.TestCase):
    def test_real_writer_preserves_metadata_and_is_idempotent(self):
        source = Path(__file__).resolve().parents[3] / "static/compatibilities/kruise.yaml"
        metadata = yaml.safe_load(source.read_text())
        rows = copy.deepcopy(metadata["versions"])
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "kruise.yaml"
            output.write_text(source.read_text())
            with patch.object(utils, "get_chart_images", return_value=[]) as images, \
                 patch.object(utils, "summarization_enabled", return_value=False), \
                 patch.object(utils, "helm_summary", side_effect=AssertionError("AI call forbidden")), \
                 patch.object(utils.traceback, "print_exc", side_effect=AssertionError("Writer failed")), \
                 patch("subprocess.run", side_effect=AssertionError("Subprocess forbidden")), \
                 patch("requests.sessions.Session.request", side_effect=AssertionError("Network forbidden")), \
                 contextlib.redirect_stdout(io.StringIO()):
                utils.update_compatibility_info(str(output), copy.deepcopy(rows))
                first = yaml.safe_load(output.read_text())
                utils.update_compatibility_info(str(output), copy.deepcopy(rows))
                second = yaml.safe_load(output.read_text())
            self.assertEqual(first, second)
            self.assertGreater(images.call_count, 0)
            for key in ("icon", "git_url", "release_url", "helm_repository_url", "chart_name"):
                self.assertEqual(first[key], metadata[key])
            self.assertEqual(first["versions"][0]["version"], rows[0]["version"])
            original = {row["version"]: row for row in rows}
            self.assertEqual({row["version"].rsplit(".", 1)[0] for row in first["versions"]},
                             {row["version"].rsplit(".", 1)[0] for row in rows})
            for row in first["versions"]:
                self.assertEqual(row["kube"], original[row["version"]]["kube"])
                self.assertEqual(row["chart_version"], original[row["version"]]["chart_version"])


if __name__ == "__main__":
    unittest.main()
