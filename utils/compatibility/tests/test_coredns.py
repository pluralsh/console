import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch


SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "coredns.py"
spec = importlib.util.spec_from_file_location("coredns", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

TABLE = """| Kubernetes Version | CoreDNS Version |
| --- | --- |
| v1.33 | v1.12.0 |
"""
CONSTANTS = {
    "1.34": b'const (\n CoreDNSVersion = "v1.12.1"\n)\n',
    "1.35": b'const (\n CoreDNSVersion = "v1.13.1"\n)\n',
    "1.36": b'const (\n CoreDNSVersion = "v1.14.2"\n)\n',
}


def fetch_constants(url):
    for kube, content in CONSTANTS.items():
        if url == scraper.kubeadm_constants_url.format(version=kube):
            return content
    raise AssertionError(f"Unexpected URL {url}")


class CoreDNSReleaseTests(unittest.TestCase):
    def rows(self, chart_versions=None, latest="1.36", fetcher=fetch_constants):
        return scraper.extract_new_kubeadm_versions(
            scraper.parse_markdown_table(TABLE),
            chart_versions if chart_versions is not None else {"1.13.1": "1.46.2"},
            latest,
            fetcher,
        )

    def test_adds_exact_release_pair_only_when_chart_exists(self):
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["version"], "1.13.1")
        self.assertEqual(rows[0]["chart_version"], "1.46.2")
        self.assertEqual(rows[0]["kube"], ["1.35"])

    def test_does_not_fetch_already_documented_versions(self):
        self.assertEqual(self.rows(latest="1.33", fetcher=lambda _: self.fail()), [])

    def test_groups_same_app_only_at_documented_releases(self):
        rows = self.rows(
            latest="1.35", fetcher=lambda _: b'CoreDNSVersion = "v1.13.1"\n'
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kube"], ["1.34", "1.35"])

    def test_rejects_comment_prerelease_and_ambiguous_constants(self):
        for content in [
            b'// CoreDNSVersion = "v1.13.1"\n',
            b'CoreDNSVersion = "v1.13.1-rc.1"\n',
            b'CoreDNSVersion = "v1.13.1"\nCoreDNSVersion = "v1.14.2"\n',
        ]:
            with self.subTest(content=content):
                with self.assertRaisesRegex(ValueError, "Invalid CoreDNS version"):
                    self.rows(fetcher=lambda _: content)

    def test_missing_source_aborts_before_catalog_write(self):
        with patch.object(scraper, "fetch_page", side_effect=[TABLE.encode(), None]), \
             patch.object(scraper, "get_chart_versions", return_value={"1.13.1": "1.46.2"}), \
             patch.object(scraper, "current_kube_version", return_value="1.36"), \
             patch.object(scraper, "update_compatibility_info") as writer:
            scraper.scrape()
            writer.assert_not_called()

    def test_scrape_keeps_legacy_rows_and_adds_release_row(self):
        def fetcher(url):
            return TABLE.encode() if url == scraper.compatibility_url else fetch_constants(url)

        with patch.object(scraper, "fetch_page", side_effect=fetcher), \
             patch.object(scraper, "get_chart_versions", return_value={"1.12.0": "1.42.2", "1.13.1": "1.46.2"}), \
             patch.object(scraper, "current_kube_version", return_value="1.36"), \
             patch.object(scraper, "update_compatibility_info") as writer:
            scraper.scrape()
        writer.assert_called_once()
        rows = {row["version"]: row for row in writer.call_args.args[1]}
        self.assertEqual(set(rows), {"1.12.0", "1.13.1"})
        self.assertEqual(rows["1.13.1"]["kube"], ["1.35"])

    def test_reused_coredns_version_does_not_replace_legacy_row(self):
        def fetcher(url):
            return TABLE.encode() if url == scraper.compatibility_url else b'CoreDNSVersion = "v1.12.0"\n'

        with patch.object(scraper, "fetch_page", side_effect=fetcher), \
             patch.object(scraper, "get_chart_versions", return_value={"1.12.0": "1.42.2"}), \
             patch.object(scraper, "current_kube_version", return_value="1.35"), \
             patch.object(scraper, "update_compatibility_info") as writer:
            scraper.scrape()
        rows = writer.call_args.args[1]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kube"], ["1.33", "1.34", "1.35"])


if __name__ == "__main__":
    unittest.main()
