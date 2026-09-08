"""Offline tests for the upstream Knative schedule, Helm index, and GA history."""

from datetime import date
import importlib.util
from pathlib import Path
import unittest


SCRAPER_PATH = Path(__file__).resolve().parents[1] / "scrapers" / "knative-operator.py"
SPEC = importlib.util.spec_from_file_location("knative_operator", SCRAPER_PATH)
knative = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(knative)


SCHEDULE = """
## Upcoming releases
| Release | Date | EOL | Min K8s Version | Notes |
| --- | --- | --- | --- | --- |
| 1.24 | 2026-10-27 | 2027-05-04 | 1.35 | scheduled |

## Releases supported by community
| Release | Date | EOL | Min K8s Version | Notes |
| --- | --- | --- | --- | --- |
| 1.23 | 2026-07-28 | 2027-02-02 | 1.34 | |

## No longer supported releases
| Release | Date | EOL | Min K8s Version | Notes |
| --- | --- | --- | --- | --- |
| 1.18 | 2025-04-22 | 2025-10-28 | 1.31 | |
"""

KUBERNETES_RELEASES = {
    "1.31": date(2024, 8, 13),
    "1.32": date(2024, 12, 11),
    "1.33": date(2025, 4, 23),
    "1.34": date(2025, 8, 27),
    "1.35": date(2025, 12, 17),
    "1.36": date(2026, 4, 22),
    "1.37": date(2026, 8, 26),
}


def helm_index(*pairs):
    rows = ["apiVersion: v1", "entries:", "  knative-operator:"]
    for chart, app in pairs:
        rows.extend([f'  - version: "{chart}"', f'    appVersion: "{app}"'])
    return "\n".join(rows)


def kubernetes_release(**overrides):
    payload = {
        "tag_name": "v1.33.0",
        "draft": False,
        "prerelease": False,
        "published_at": "2025-04-23T15:00:00Z",
    }
    payload.update(overrides)
    return payload


class ScheduleTests(unittest.TestCase):
    def test_reads_release_date_and_floor_from_every_schedule_section(self):
        self.assertEqual(knative.parse_schedule(SCHEDULE), {
            "1.24": {"minimum": "1.35", "date": date(2026, 10, 27)},
            "1.23": {"minimum": "1.34", "date": date(2026, 7, 28)},
            "1.18": {"minimum": "1.31", "date": date(2025, 4, 22)},
        })

    def test_matches_reordered_headers_and_normalizes_version_prefixes(self):
        source = """
| Notes | Min   K8s Version | Date | Release |
| :--- | ---: | :---: | --- |
| example | v1.34 | 2026-07-28 | v1.23 |
"""
        self.assertEqual(knative.parse_schedule(source), {
            "1.23": {"minimum": "1.34", "date": date(2026, 7, 28)},
        })

    def test_ignores_unrelated_tables(self):
        unrelated = "| Name | Count |\n| --- | --- |\n| widgets | 4 |\n\n"
        self.assertEqual(knative.parse_schedule(unrelated + SCHEDULE),
                         knative.parse_schedule(SCHEDULE))

    def test_rejects_missing_or_empty_schedule(self):
        for source in ["", "<html>Unavailable</html>", SCHEDULE.split("| 1.24")[0]]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                knative.parse_schedule(source)

    def test_rejects_invalid_release_or_minimum_version(self):
        for value in ["1.x", "1.34 or 1.35", "", "01.34", "1.34.0"]:
            for original in ["1.23", "1.34"]:
                with self.subTest(value=value, original=original), self.assertRaises(ValueError):
                    knative.parse_schedule(SCHEDULE.replace(original, value))

    def test_rejects_invalid_or_missing_date(self):
        for value in ["", "2026-02-30", "28 July 2026", "TBD"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                knative.parse_schedule(SCHEDULE.replace("2026-07-28", value))

    def test_rejects_truncated_rows(self):
        source = SCHEDULE.replace("| 1.23 | 2026-07-28 | 2027-02-02 | 1.34 | |", "| 1.23 |")
        with self.assertRaises(ValueError):
            knative.parse_schedule(source)

    def test_rejects_duplicate_required_header(self):
        source = "| Release | Release | Date | Min K8s Version |\n|---|---|---|---|\n|1.23|1.22|2026-07-28|1.34|"
        with self.assertRaises(ValueError):
            knative.parse_schedule(source)

    def test_rejects_missing_date_header(self):
        with self.assertRaises(ValueError):
            knative.parse_schedule(SCHEDULE.replace("| Date |", "| Published |"))

    def test_collapses_identical_duplicate_rows(self):
        self.assertEqual(knative.parse_schedule(SCHEDULE + SCHEDULE),
                         knative.parse_schedule(SCHEDULE))

    def test_rejects_duplicate_release_with_conflicting_floor_or_date(self):
        for duplicate in [SCHEDULE.replace("1.34", "1.33"),
                          SCHEDULE.replace("2026-07-28", "2026-07-29")]:
            with self.subTest(duplicate=duplicate), self.assertRaises(ValueError):
                knative.parse_schedule(SCHEDULE + duplicate)


class ChartTests(unittest.TestCase):
    def test_preserves_exact_chart_tag_and_normalizes_app_version(self):
        self.assertEqual(knative.parse_charts(helm_index(("v1.23.1", "v1.23.1"))), [
            {"version": "1.23.1", "chart_version": "v1.23.1"},
        ])

    def test_excludes_prereleases_of_either_chart_or_app(self):
        source = helm_index(
            ("v1.24.0-rc.1", "1.24.0"),
            ("v1.24.0", "1.24.0-dev.20260908"),
            ("v1.23.1", "1.23.1"),
        )
        self.assertEqual(knative.parse_charts(source), [
            {"version": "1.23.1", "chart_version": "v1.23.1"},
        ])

    def test_rejects_app_build_metadata_unsupported_by_shared_updater(self):
        source = helm_index(("v1.23.1+chart.2", "1.23.1+build.7"))
        with self.assertRaises(ValueError):
            knative.parse_charts(source)

    def test_sorts_app_versions_numerically_in_descending_order(self):
        pairs = [("v1.9.10", "1.9.10"), ("v1.23.2", "1.23.2"), ("v1.23.10", "1.23.10")]
        result = knative.parse_charts(helm_index(*pairs))
        self.assertEqual([row["version"] for row in result], ["1.23.10", "1.23.2", "1.9.10"])
        self.assertEqual(result, knative.parse_charts(helm_index(*reversed(pairs))))

    def test_keeps_numerically_latest_chart_for_the_same_app(self):
        pairs = [("v1.23.2", "1.23.1"), ("v1.23.10", "1.23.1"), ("v1.23.1", "1.23.1")]
        expected = [{"version": "1.23.1", "chart_version": "v1.23.10"}]
        self.assertEqual(knative.parse_charts(helm_index(*pairs)), expected)
        self.assertEqual(knative.parse_charts(helm_index(*reversed(pairs))), expected)

    def test_deduplicates_identical_entries(self):
        source = helm_index(("v1.23.1", "1.23.1"), ("v1.23.1", "1.23.1"))
        self.assertEqual(knative.parse_charts(source), [
            {"version": "1.23.1", "chart_version": "v1.23.1"},
        ])

    def test_rejects_chart_mapped_to_conflicting_app_versions(self):
        with self.assertRaises(ValueError):
            knative.parse_charts(helm_index(("v1.23.1", "1.23.1"), ("v1.23.1", "1.23.0")))

    def test_rejects_malformed_yaml_or_empty_chart_data(self):
        sources = ["[", "null", "[]", "entries: {}", "entries:\n  knative-operator: []",
                   "entries:\n  knative-operator: [null]",
                   "entries:\n  knative-operator: {version: '1.23.1'}"]
        for source in sources:
            with self.subTest(source=source), self.assertRaises(ValueError):
                knative.parse_charts(source)

    def test_rejects_malformed_chart_or_app_versions(self):
        for version in ["latest", "1.23", "01.23.1", "1.23.1-", ""]:
            for pair in [(version, "1.23.1"), ("1.23.1", version)]:
                with self.subTest(pair=pair), self.assertRaises(ValueError):
                    knative.parse_charts(helm_index(pair))

    def test_rejects_missing_chart_or_app_version_field(self):
        for field in ["version", "appVersion"]:
            source = f'entries:\n  knative-operator:\n  - {field}: "1.23.1"'
            with self.subTest(field=field), self.assertRaises(ValueError):
                knative.parse_charts(source)

    def test_rejects_index_containing_only_prereleases(self):
        with self.assertRaises(ValueError):
            knative.parse_charts(helm_index(("v1.24.0-rc.1", "1.24.0-rc.1")))


class KubernetesReleaseTests(unittest.TestCase):
    def test_reads_minor_and_ga_publication_date(self):
        self.assertEqual(knative.parse_kubernetes_release(kubernetes_release(), "v1.33.0"),
                         ("1.33", date(2025, 4, 23)))

    def test_accepts_explicit_timezone_offset(self):
        payload = kubernetes_release(published_at="2025-04-23T15:00:00+00:00")
        self.assertEqual(knative.parse_kubernetes_release(payload, "v1.33.0"),
                         ("1.33", date(2025, 4, 23)))

    def test_rejects_a_release_for_a_different_tag(self):
        with self.assertRaises(ValueError):
            knative.parse_kubernetes_release(kubernetes_release(tag_name="v1.32.0"), "v1.33.0")

    def test_rejects_non_ga_expected_tags(self):
        for tag in ["1.33.0", "v1.33.1", "v1.33.0-rc.1", "v1.33.0+build.1", "v2.33.0"]:
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                knative.parse_kubernetes_release(kubernetes_release(tag_name=tag), tag)

    def test_rejects_drafts_and_prereleases(self):
        for field in ["draft", "prerelease"]:
            for value in [True, "false", None]:
                with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                    knative.parse_kubernetes_release(kubernetes_release(**{field: value}), "v1.33.0")

    def test_rejects_missing_required_release_fields(self):
        for field in ["tag_name", "draft", "prerelease", "published_at"]:
            payload = kubernetes_release()
            del payload[field]
            with self.subTest(field=field), self.assertRaises(ValueError):
                knative.parse_kubernetes_release(payload, "v1.33.0")

    def test_rejects_missing_timezone_or_invalid_timestamp(self):
        for timestamp in [None, "", "2025-04-23", "2025-04-23T15:00:00", "2025-02-30T15:00:00Z"]:
            with self.subTest(timestamp=timestamp), self.assertRaises(ValueError):
                knative.parse_kubernetes_release(kubernetes_release(published_at=timestamp), "v1.33.0")

    def test_rejects_non_object_payloads(self):
        for payload in [None, [], "error"]:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                knative.parse_kubernetes_release(payload, "v1.33.0")


class CompatibilityTests(unittest.TestCase):
    def test_knative_118_excludes_kubernetes_133_released_the_next_day(self):
        rows = knative.build_versions(SCHEDULE, helm_index(("v1.18.0", "1.18.0")), KUBERNETES_RELEASES)
        self.assertEqual(rows, [{
            "version": "1.18.0",
            "chart_version": "v1.18.0",
            "kube": ["1.32", "1.31"],
            "requirements": [],
            "incompatibilities": [],
        }])

    def test_patch_release_keeps_the_minor_cutoff_after_a_new_kubernetes_ga(self):
        index = helm_index(("v1.23.0", "1.23.0"), ("v1.23.1", "1.23.1"))
        index += '\n    created: "2026-09-01T10:17:05Z"\n'
        rows = knative.build_versions(SCHEDULE, index, KUBERNETES_RELEASES)
        self.assertEqual([row["version"] for row in rows], ["1.23.1", "1.23.0"])
        for row in rows:
            self.assertEqual(row["kube"], ["1.36", "1.35", "1.34"])

    def test_includes_a_kubernetes_ga_on_the_exact_minor_release_date(self):
        history = dict(KUBERNETES_RELEASES, **{"1.33": date(2025, 4, 22)})
        rows = knative.build_versions(SCHEDULE, helm_index(("v1.18.0", "1.18.0")), history)
        self.assertEqual(rows[0]["kube"], ["1.33", "1.32", "1.31"])

    def test_emits_only_chart_versions_even_when_schedule_has_future_releases(self):
        rows = knative.build_versions(SCHEDULE, helm_index(("v1.23.1", "1.23.1")), KUBERNETES_RELEASES)
        self.assertEqual([row["version"] for row in rows], ["1.23.1"])

    def test_unknown_released_minor_fails_the_whole_join(self):
        index = helm_index(("v1.23.1", "1.23.1"), ("v1.99.0", "1.99.0"))
        with self.assertRaises(ValueError):
            knative.build_versions(SCHEDULE, index, KUBERNETES_RELEASES)

    def test_rejects_floor_that_was_not_ga_at_the_minor_cutoff(self):
        source = SCHEDULE.replace("| 1.31 |", "| 1.33 |")
        with self.assertRaises(ValueError):
            knative.build_versions(source, helm_index(("v1.18.0", "1.18.0")), KUBERNETES_RELEASES)

    def test_rejects_missing_kubernetes_floor(self):
        history = {minor: day for minor, day in KUBERNETES_RELEASES.items() if minor != "1.34"}
        with self.assertRaises(ValueError):
            knative.build_versions(SCHEDULE, helm_index(("v1.23.1", "1.23.1")), history)

    def test_rejects_gaps_in_kubernetes_history(self):
        for missing_minor in ["1.32", "1.36"]:
            history = {minor: day for minor, day in KUBERNETES_RELEASES.items() if minor != missing_minor}
            with self.subTest(missing_minor=missing_minor), self.assertRaises(ValueError):
                knative.build_versions(SCHEDULE, helm_index(("v1.18.0", "1.18.0")), history)

    def test_rejects_non_increasing_kubernetes_ga_dates(self):
        for invalid_date in [KUBERNETES_RELEASES["1.35"], date(2025, 12, 16)]:
            history = dict(KUBERNETES_RELEASES, **{"1.36": invalid_date})
            with self.subTest(invalid_date=invalid_date), self.assertRaises(ValueError):
                knative.build_versions(SCHEDULE, helm_index(("v1.23.1", "1.23.1")), history)

    def test_does_not_require_history_older_than_the_lowest_needed_floor(self):
        history = {minor: day for minor, day in KUBERNETES_RELEASES.items()
                   if int(minor.split(".")[1]) >= 34}
        rows = knative.build_versions(SCHEDULE, helm_index(("v1.23.1", "1.23.1")), history)
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34"])

    def test_output_is_independent_of_source_order(self):
        pairs = [("v1.18.0", "1.18.0"), ("v1.23.2", "1.23.2"), ("v1.23.10", "1.23.10")]
        result = knative.build_versions(SCHEDULE, helm_index(*pairs), KUBERNETES_RELEASES)
        reversed_history = dict(reversed(list(KUBERNETES_RELEASES.items())))
        self.assertEqual(result, knative.build_versions(SCHEDULE, helm_index(*reversed(pairs)), reversed_history))
        self.assertEqual([row["version"] for row in result], ["1.23.10", "1.23.2", "1.18.0"])

    def test_rejects_chart_build_metadata_with_no_ordered_precedence(self):
        with self.assertRaises(ValueError):
            knative.build_versions(SCHEDULE, helm_index(("v1.23.1+chart.2", "1.23.1")),
                                   KUBERNETES_RELEASES)

    def test_rejects_conflicting_chart_aliases(self):
        with self.assertRaises(ValueError):
            knative.parse_charts(helm_index(("v1.23.1", "1.23.1"), ("1.23.1", "1.23.0")))


if __name__ == "__main__":
    unittest.main()
