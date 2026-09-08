from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scrapers.consul import (  # noqa: E402
    build_versions,
    latest_stable_charts,
    parse_kube_versions,
    parse_standard_matrix,
    parse_standard_matrix_pairings,
)

STANDARD_TABLE = """
<html><body>
<h4>Standard releases</h4>
<table>
  <thead>
    <tr>
      <th>Consul version</th>
      <th>Compatible consul-k8s versions</th>
      <th>Compatible Kubernetes versions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2.0.x</td>
      <td>2.0.x</td>
      <td>1.30.x - 1.35.x</td>
    </tr>
    <tr>
      <td>1.22.x</td>
      <td>1.9.x</td>
      <td>1.30.x - 1.35.x</td>
    </tr>
    <tr>
      <td>1.21.x</td>
      <td>1.8.x<br/>1.7.x</td>
      <td>1.30.x - 1.35.x<br/>1.30.x - 1.33.x</td>
    </tr>
    <tr>
      <td>1.17.x</td>
      <td>1.3.x</td>
      <td>1.25.x - 1.28.x</td>
    </tr>
    <tr>
      <td>1.21.x Ent</td>
      <td>1.8.x</td>
      <td>1.30.x - 1.35.x</td>
    </tr>
  </tbody>
</table>
<h4>Enterprise Long Term Support releases</h4>
<table>
  <tr>
    <th>Consul version</th>
    <th>Compatible consul-k8s versions</th>
    <th>Compatible Kubernetes versions</th>
  </tr>
  <tr>
    <td>1.18.x Ent</td>
    <td>1.7.x</td>
    <td>1.30.x - 1.33.x</td>
  </tr>
</table>
</body></html>
"""

HELM_ENTRIES = [
    {"version": "2.0.2-oss", "appVersion": "2.0.2"},
    {"version": "2.0.3", "appVersion": "2.0.3"},
    {"version": "2.0.0-rc1", "appVersion": "2.0.0-rc1"},
    {"version": "1.9.11", "appVersion": "1.22.7"},
    {"version": "1.9.10", "appVersion": "1.22.7"},
    {"version": "1.8.16", "appVersion": "1.21.5"},
    {"version": "1.8.15", "appVersion": "1.21.5"},
    {"version": "1.7.13", "appVersion": "1.21.5"},
    {"version": "1.3.9", "appVersion": "1.17.3"},
]


class ConsulScraperTests(unittest.TestCase):
    def test_parses_standard_table_and_skips_enterprise(self):
        pairings = parse_standard_matrix_pairings(STANDARD_TABLE)
        self.assertEqual(
            [(row["consul_family"], row["chart_family"], row["kube"][-1]) for row in pairings],
            [
                ("2.0", "2.0", "1.35"),
                ("1.22", "1.9", "1.35"),
                ("1.21", "1.8", "1.35"),
                ("1.21", "1.7", "1.33"),
                ("1.17", "1.3", "1.28"),
            ],
        )

    def test_keeps_newest_chart_family_for_consul_1_21(self):
        rows = parse_standard_matrix(STANDARD_TABLE)
        self.assertEqual(
            [(row["consul_family"], row["chart_family"], row["kube"][-1]) for row in rows],
            [
                ("2.0", "2.0", "1.35"),
                ("1.22", "1.9", "1.35"),
                ("1.21", "1.8", "1.35"),
                ("1.17", "1.3", "1.28"),
            ],
        )

    def test_parses_kube_ranges_with_or_without_x_suffix(self):
        self.assertEqual(parse_kube_versions("1.30.x - 1.35.x")[0], "1.30")
        self.assertEqual(parse_kube_versions("1.30.x - 1.35.x")[-1], "1.35")
        self.assertEqual(parse_kube_versions("1.30 – 1.33")[-1], "1.33")

    def test_ignores_prerelease_and_oss_chart_tags(self):
        charts = latest_stable_charts(HELM_ENTRIES)
        self.assertEqual(charts[("2.0", "2.0")]["chart_version"], "2.0.3")
        self.assertEqual(charts[("2.0", "2.0")]["version"], "2.0.3")
        self.assertEqual(charts[("1.9", "1.22")]["chart_version"], "1.9.11")
        self.assertEqual(charts[("1.9", "1.22")]["version"], "1.22.7")
        self.assertNotIn(("1.8", "1.22"), charts)

    def test_joins_matching_consul_and_chart_families(self):
        rows = parse_standard_matrix(STANDARD_TABLE)
        versions = build_versions(rows, latest_stable_charts(HELM_ENTRIES))
        self.assertEqual(
            [(item["version"], item["chart_version"], item["kube"][-1]) for item in versions],
            [
                ("2.0.3", "2.0.3", "1.35"),
                ("1.22.7", "1.9.11", "1.35"),
                ("1.21.5", "1.8.16", "1.35"),
                ("1.17.3", "1.3.9", "1.28"),
            ],
        )

    def test_rejects_chart_family_with_mismatched_consul_appversion(self):
        rows = parse_standard_matrix(STANDARD_TABLE)
        versions = build_versions(
            rows,
            {
                ("2.0", "2.0"): {"version": "2.0.3", "chart_version": "2.0.3"},
                ("1.9", "1.21"): {"version": "1.21.5", "chart_version": "1.9.11"},
                ("1.8", "1.21"): {"version": "1.21.5", "chart_version": "1.8.16"},
            },
        )
        self.assertEqual(
            [(item["version"], item["chart_version"]) for item in versions],
            [("2.0.3", "2.0.3"), ("1.21.5", "1.8.16")],
        )
        self.assertTrue(
            all(item["chart_version"] != "1.9.11" for item in versions)
        )

    def test_malformed_html_returns_no_rows(self):
        self.assertEqual(parse_standard_matrix("<html><body>no table</body></html>"), [])


if __name__ == "__main__":
    unittest.main()
