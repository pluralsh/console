import importlib
import unittest

scraper = importlib.import_module("scrapers.kuadrant-operator")


def entry(app="1.5.3", chart="1.5.3", kube=">=1.19.0-0"):
    return {"appVersion": app, "version": chart, "kubeVersion": kube}


def extract(*entries):
    return scraper.extract_versions({"entries": {"kuadrant-operator": entries}}, "1.36")


class KuadrantTests(unittest.TestCase):
    def test_stable_exact_identities_only(self):
        rows = extract(entry(), entry("1.6.0-rc1"), entry(chart="1.6.0-rc1"), entry(None), entry("1.5"))
        self.assertEqual([x["version"] for x in rows], ["1.5.3"])

    def test_app_chart_mapping_and_latest_chart(self):
        rows = extract(entry("1.5.3", "2.0.0"), entry("1.5.3", "2.1.0"))
        self.assertEqual(rows[0]["chart_version"], "2.1.0")
        self.assertEqual(rows[0]["version"], "1.5.3")

    def test_per_release_floor_and_catalog_cap(self):
        rows = extract(entry(), entry("1.4.7", "1.4.7", ">=1.25.0-0"))
        self.assertEqual(rows[0]["kube"], [f"1.{i}" for i in range(36, 18, -1)])
        self.assertEqual(rows[1]["kube"][-1], "1.25")

    def test_equal_floor(self):
        self.assertEqual(scraper.kubernetes_versions(">=1.36.0-0", "1.36"), ["1.36"])

    def test_unknown_ranges_and_future_floor_rejected(self):
        for spec in [">=1.37.0-0", ">=1.19.0 <1.30.0", ">=1.19.0 || >=1.35.0", ">=1.19.2", "garbage"]:
            with self.subTest(spec=spec), self.assertRaises(ValueError):
                scraper.kubernetes_versions(spec, "1.36")

    def test_missing_constraint_excluded(self):
        self.assertEqual(extract(entry(kube=None)), [])

    def test_order_independent_and_repeatable(self):
        entries = [entry(), entry("1.4.7", "1.4.7"), entry("1.5.3", "1.5.4")]
        self.assertEqual(extract(*entries), extract(*reversed(entries)))
        self.assertEqual(extract(*entries), extract(*entries))

    def test_unrelated_chart_ignored(self):
        self.assertEqual(scraper.extract_versions({"entries": {"other": [entry()]}}, "1.36"), [])

    def test_official_index_snapshot(self):
        from pathlib import Path
        import yaml
        index = yaml.safe_load((Path(__file__).parent / "fixtures/kuadrant-index.yaml").read_text())
        rows = scraper.extract_versions(index, "1.36")
        self.assertEqual(len(rows), 16)
        self.assertEqual(rows[0]["version"], "1.5.3")
        self.assertEqual(rows[-1]["version"], "1.0.0")
        self.assertTrue(all(row["version"] == row["chart_version"] for row in rows))

    def test_shared_reducer_retains_floor_change(self):
        from utils import reduce_versions
        rows = extract(entry("1.5.0", "1.5.0"), entry("1.5.1", "1.5.1", ">=1.25.0-0"), entry())
        reduced = reduce_versions(rows)
        self.assertEqual([row["version"] for row in reduced], ["1.5.3", "1.5.1", "1.5.0"])
        self.assertEqual(reduce_versions(reduced), reduced)
