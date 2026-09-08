import importlib.util
from pathlib import Path
import unittest

import yaml

SCRAPER = Path(__file__).parents[1] / "scrapers" / "emqx-operator.py"
FIXTURES = Path(__file__).parent / "fixtures" / "emqx-operator"
spec = importlib.util.spec_from_file_location("emqx_operator", SCRAPER)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def readme(version):
    return (FIXTURES / f"README-{version}.md").read_bytes()


def release_document(url):
    return readme(url.split("/")[-2])


class EMQXOperatorTests(unittest.TestCase):
    def test_real_index_maps_operator_versions_to_distinct_chart_versions(self):
        releases = scraper.chart_releases((FIXTURES / "index.yaml").read_bytes())
        self.assertEqual(releases, [
            ("2.3.2", "2.3.2"),
            ("2.2.29", "2.2.29"),
            ("2.1.2", "2.1.2"),
            ("2.1.1", "2.1.1"),
            ("1.2.8", "1.0.12"),
            ("1.2.0", "1.0.6"),
        ])

    def test_chart_order_does_not_change_the_selected_mapping(self):
        index = yaml.safe_load((FIXTURES / "index.yaml").read_text())
        expected = scraper.chart_releases(yaml.safe_dump(index))
        index["entries"]["emqx-operator"].reverse()
        self.assertEqual(scraper.chart_releases(yaml.safe_dump(index)), expected)

    def test_stable_chart_does_not_make_an_app_prerelease_stable(self):
        index = yaml.safe_load((FIXTURES / "index.yaml").read_text())
        index["entries"]["emqx-operator"].append({
            "version": "3.0.0", "appVersion": "3.0.0-rc.1",
        })
        releases = scraper.chart_releases(yaml.safe_dump(index))
        self.assertNotIn("3.0.0-rc.1", dict(releases))

    def test_malformed_or_empty_catalog_fails_closed(self):
        for payload in ["entries: []", "entries: {}", "[]", "entries: {emqx-operator: [null]}"]:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                scraper.chart_releases(payload)

    def test_legacy_release_requires_kubernetes_120(self):
        self.assertEqual(
            scraper.supported_kubernetes(readme("1.2.8"), "1.24"),
            ["1.24", "1.23", "1.22", "1.21", "1.20"],
        )

    def test_conditional_lower_requirement_is_not_full_feature_support(self):
        # Actual 2.1.1 README permits 1.21 only without MixedProtocolLBService.
        self.assertEqual(
            scraper.supported_kubernetes(readme("2.1.1"), "1.26"),
            ["1.26", "1.25", "1.24"],
        )

    def test_both_published_table_formats_exclude_limited_versions(self):
        for version in ["2.1.2", "2.2.29"]:
            with self.subTest(version=version):
                self.assertEqual(
                    scraper.supported_kubernetes(readme(version), "1.26"),
                    ["1.26", "1.25", "1.24"],
                )

    def test_current_release_explicit_plus_requirement_is_bounded_by_catalog(self):
        self.assertEqual(
            scraper.supported_kubernetes(readme("2.3.2"), "1.25"),
            ["1.25", "1.24"],
        )

    def test_reordered_compatibility_columns_preserve_support(self):
        lines = []
        for line in readme("2.2.29").decode().splitlines():
            if line.startswith("|"):
                cells = line.strip("|").split("|")
                cells[0], cells[1] = cells[1], cells[0]
                line = "|" + "|".join(cells) + "|"
            lines.append(line)
        self.assertEqual(
            scraper.supported_kubernetes("\n".join(lines), "1.26"),
            ["1.26", "1.25", "1.24"],
        )

    def test_missing_or_qualified_full_support_row_is_not_headline_fallback(self):
        source = readme("2.2.29").decode()
        for changed in [
            source.replace("All functions supported", "Supported, with exceptions"),
            source.replace("Kubernetes Versions", "Kubernetes Releases"),
            "\n".join(line for line in source.splitlines() if "All functions supported" not in line),
        ]:
            with self.subTest(source=changed), self.assertRaises(ValueError):
                scraper.supported_kubernetes(changed, "1.26")

    def test_missing_or_changed_requirement_is_not_guessed(self):
        source = readme("1.2.8").decode()
        for changed in [
            "Kubernetes is required.",
            source.replace(">=1.20.0", ">=1.20.0, <1.25.0"),
            source.replace(">=1.20.0", ">=1.20.1"),
        ]:
            with self.subTest(source=changed), self.assertRaises(ValueError):
                scraper.supported_kubernetes(changed, "1.26")

    def test_new_table_bounds_and_conflicting_requirements_require_review(self):
        source = readme("2.2.29").decode()
        for changed in [
            source.replace("1.24 (included) ~ latest", "1.24 (included) ~ 1.25"),
            source.replace("1.24 (included) ~ latest", "1.25 (included) ~ latest"),
            source + "\n- Access to a Kubernetes v1.25+ cluster.\n",
        ]:
            with self.subTest(source=changed), self.assertRaises(ValueError):
                scraper.supported_kubernetes(changed, "1.26")

    def test_invalid_current_version_and_future_requirement_fail_closed(self):
        for current in ["1.23", "2.0", "1.25.0", "not-a-version"]:
            with self.subTest(current=current), self.assertRaises(ValueError):
                scraper.supported_kubernetes(readme("2.3.2"), current)

    def test_rows_join_real_chart_and_tagged_readme_fixtures(self):
        rows = scraper.build_rows(
            (FIXTURES / "index.yaml").read_bytes(), "1.26", release_document
        )
        versions = {row["version"]: row for row in rows}
        self.assertEqual(len(versions), 6)
        self.assertEqual(versions["1.2.8"]["chart_version"], "1.0.12")
        self.assertEqual(versions["1.2.8"]["kube"][-1], "1.20")
        self.assertEqual(versions["2.1.1"]["kube"][-1], "1.24")
        self.assertEqual(versions["2.3.2"]["kube"], ["1.26", "1.25", "1.24"])

    def test_one_unavailable_release_aborts_instead_of_returning_partial_rows(self):
        def missing_oldest(url):
            return None if url.endswith("/1.2.0/README.md") else release_document(url)

        with self.assertRaisesRegex(ValueError, "Missing EMQX 1.2.0 release README"):
            scraper.build_rows((FIXTURES / "index.yaml").read_bytes(), "1.26", missing_oldest)

    def test_invalid_release_document_identifies_the_affected_version(self):
        def corrupt_current(url):
            return b"\xff" if url.endswith("/2.3.2/README.md") else release_document(url)

        with self.assertRaisesRegex(ValueError, "Invalid EMQX 2.3.2 release requirements"):
            scraper.build_rows((FIXTURES / "index.yaml").read_bytes(), "1.26", corrupt_current)


if __name__ == "__main__":
    unittest.main()
