import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).parents[1] / "scrapers/network-operator.py"
spec = importlib.util.spec_from_file_location("network_operator", path)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def page(version="26.7.0", constraint="&gt;=1.32 and &lt;=1.36"):
    return f"""<p>NVIDIA Network Operator v{version}</p>
    <table><tr><th>Component</th><th>Version</th><th>Notes</th></tr>
    <tr><td>Kubernetes</td><td>{constraint}</td><td></td></tr></table>"""


INDEX = """entries:
  network-operator:
  - {version: 26.7.0, appVersion: v26.7.0}
  - {version: 26.7.1, appVersion: v26.7.0}
  - {version: 26.7.2-rc.1, appVersion: v26.7.0}
  - {version: 26.8.0, appVersion: v26.8.0-rc.1}
  - {version: 26.4.0, appVersion: v26.4.0}
  - {version: junk, appVersion: junk}
"""


class NetworkOperatorTests(unittest.TestCase):
    def test_official_prerequisite_table_fixtures(self):
        fixtures = Path(__file__).parent / "fixtures/network-operator"
        for version, low, high in [("26.7.0", 32, 36), ("26.4.1", 31, 36)]:
            with self.subTest(version=version):
                content = (fixtures / f"{version}.html").read_text()
                self.assertEqual(scraper.parse_support(content, version),
                                 [f"1.{minor}" for minor in range(high, low - 1, -1)])
        with self.assertRaisesRegex(ValueError, "Cannot represent"):
            scraper.parse_support((fixtures / "24.7.0.html").read_text(), "24.7.0")

    def test_explicit_inclusive_range(self):
        self.assertEqual(scraper.parse_support(page(), "26.7.0"),
                         ["1.36", "1.35", "1.34", "1.33", "1.32"])

    def test_identity_prevents_2410_slug_collision(self):
        with self.assertRaisesRegex(ValueError, "identity mismatch"):
            scraper.parse_support(page("24.10.0"), "24.1.0")

    def test_patch_ceiling_is_not_widened(self):
        with self.assertRaisesRegex(ValueError, "Cannot represent"):
            scraper.parse_support(page(constraint="&gt;=1.27 and &lt;=1.30.4"), "26.7.0")

    def test_missing_and_reversed_ranges(self):
        for content in [page().replace("Kubernetes", "OpenShift"),
                        page(constraint="&gt;=1.36 and &lt;=1.32")]:
            with self.assertRaises(ValueError):
                scraper.parse_support(content, "26.7.0")

    def test_chart_selection_excludes_prereleases(self):
        self.assertEqual(scraper.stable_charts(INDEX),
                         {"26.7.0": "26.7.1", "26.4.0": "26.4.0"})

    def test_missing_page_does_not_inherit_other_release(self):
        warnings = []
        rows = scraper.build_rows(INDEX, lambda url: page() if "2670/" in url else None,
                                  warnings.append)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["chart_version"], "26.7.1")
        self.assertEqual(rows[0]["version"], "26.7.0")
        self.assertEqual(len(warnings), 1)

    def test_total_source_failure_raises_before_write(self):
        with self.assertRaisesRegex(ValueError, "No representable"):
            scraper.build_rows(INDEX, lambda url: None, lambda message: None)


if __name__ == "__main__":
    unittest.main()
