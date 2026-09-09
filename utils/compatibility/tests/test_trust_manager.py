import importlib.util
from pathlib import Path
import unittest

import yaml

SPEC = importlib.util.spec_from_file_location(
    "trust_manager", Path(__file__).parents[1] / "scrapers/trust-manager.py"
)
scraper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(scraper)


def chart(app="v0.24.0", version="v0.24.0", constraint=">= 1.25.0-0"):
    result = {"appVersion": app, "version": version}
    if constraint is not None:
        result["kubeVersion"] = constraint
    return result


def parse(entries, ceiling="1.35"):
    return scraper.extract_rows(yaml.safe_dump({"entries": {"trust-manager": entries}}), ceiling)


class TrustManagerTests(unittest.TestCase):
    def test_historical_minima_are_independent(self):
        rows = parse([chart(), chart("v0.6.0", "v0.6.0", ">= 1.22.0-0")])
        self.assertEqual(rows[0]["kube"][-1], "1.25")
        self.assertEqual(rows[1]["kube"][-1], "1.22")
        self.assertEqual(rows[0]["chart_version"], "v0.24.0")

    def test_equal_ceiling(self):
        self.assertEqual(parse([chart()], "1.25")[0]["kube"], ["1.25"])

    def test_skip_prereleases(self):
        rows = parse([chart(), chart("v0.25.0-rc.1", "v0.25.0-rc.1")])
        self.assertEqual(len(rows), 1)

    def test_skip_missing_constraint(self):
        self.assertEqual(len(parse([chart(), chart("v0.3.0", "v0.3.0", None)])), 1)

    def test_newest_chart_for_app(self):
        rows = parse([chart(), chart(version="v0.24.1", constraint=">= 1.26.0")])
        self.assertEqual(rows[0]["chart_version"], "v0.24.1")
        self.assertEqual(rows[0]["kube"][-1], "1.26")

    def test_no_fallback_to_old_chart_when_latest_has_no_constraint(self):
        with self.assertRaises(ValueError):
            parse([chart(), chart(version="v0.24.1", constraint=None)])

    def test_fail_closed_for_unrecognized_constraint(self):
        for value in [">=1.25.1", ">=1.25.0 <1.30.0", "garbage"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse([chart(constraint=value)])

    def test_below_minimum_does_not_invent_versions(self):
        with self.assertRaises(ValueError):
            parse([chart()], "1.24")

    def test_invalid_index(self):
        for content in ["[]", "{}", "entries: {}"]:
            with self.subTest(content=content), self.assertRaises(ValueError):
                scraper.extract_rows(content, "1.35")

    def test_order_does_not_change_result(self):
        entries = [chart(), chart("v0.6.0", "v0.6.0", ">= 1.22.0-0")]
        self.assertEqual(parse(entries), parse(list(reversed(entries))))


if __name__ == "__main__":
    unittest.main()
