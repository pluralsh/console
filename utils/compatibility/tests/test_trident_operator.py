import importlib
from unittest.mock import patch

import pytest
import requests
import yaml

from utils import reduce_versions, update_compatibility_info

scraper = importlib.import_module("scrapers.trident-operator")


def config(low="v1.27", high="v1.36"):
    return f'const (\n KubernetesVersionMin = "{low}"\n KubernetesVersionMax = "{high}"\n)'


def chart(app="26.06.1", version="100.2606.1", constraint=">= 1.24.0-0"):
    return dict(name="trident-operator", appVersion=app, version=version, kubeVersion=constraint)


def index(*charts):
    return yaml.safe_dump({"entries": {"trident-operator": list(charts)}})


def test_release_limits_override_looser_installer_minimum():
    versions = scraper.parse_supported_versions(config(), ">= 1.24.0-0")
    assert versions == [f"1.{n}" for n in range(36, 26, -1)]


def test_historical_operator_chart_excludes_legacy_application_versions():
    versions = scraper.parse_supported_versions(config("v1.11.0", "v1.21.0"), ">= 1.16.0 < 1.22.0")
    assert versions == [f"1.{n}" for n in range(21, 15, -1)]


def test_exclusive_upper_chart_bound():
    assert scraper.parse_supported_versions(config("v1.20", "v1.22"), ">=1.20.0 <1.22.0-0") == ["1.21", "1.20"]


def test_single_supported_minor():
    assert scraper.parse_supported_versions(config("v1.36", "v1.36"), ">=1.36.0-0") == ["1.36"]


@pytest.mark.parametrize("content", ["", config().replace("KubernetesVersionMax", "OtherMax"), config() + config(), config("v1.36", "v1.27"), config("v1.36", "v2.0"), config("v1.27.3")])
def test_malformed_source_is_rejected(content):
    with pytest.raises(ValueError):
        scraper.parse_supported_versions(content, ">=1.24.0-0")


def test_commented_assignments_are_ignored():
    text = '// KubernetesVersionMin = "v1.1"\n/*\nKubernetesVersionMax = "v1.99"\n*/\n' + config()
    assert scraper.parse_supported_versions(text, ">=1.24.0-0")[0] == "1.36"


@pytest.mark.parametrize("constraint", [">=1.27.1", "<1.20.0", "nonsense", "<=1.30.0", "^1.27.0", ">=1.27.0 || >=2.0.0"])
def test_unrepresentable_or_disjoint_chart_constraints_are_rejected(constraint):
    with pytest.raises(ValueError):
        scraper.parse_supported_versions(config(), constraint)


def test_chart_selection_skips_prereleases_and_chooses_newest_chart():
    charts = scraper.parse_charts(index(chart(), chart("26.06.1", "100.2606.2"), chart("26.10.0-rc.1"), chart(version="100.2610.0-beta.1"), chart("25.10.0", "100.2510.0")))
    assert [(x["appVersion"], x["version"]) for x in charts] == [("26.06.1", "100.2606.2"), ("25.10.0", "100.2510.0")]


@pytest.mark.parametrize("field", ["appVersion", "version"])
@pytest.mark.parametrize("value", [None, "", "garbage", "26.06", "26.06.1-", "26.06.1-rc..1", "26.06.1-01", "26.06.1+build.1", 26.06])
def test_malformed_release_alongside_valid_release_aborts_before_writing(field, value):
    invalid = chart()
    invalid[field] = value
    content = index(chart(), invalid)
    with pytest.raises(ValueError, match="version"):
        scraper.parse_charts(content)
    with patch.object(scraper, "fetch_page", return_value=content), patch.object(scraper, "update_compatibility_info") as write:
        scraper.scrape()
        write.assert_not_called()


@pytest.mark.parametrize("field", ["appVersion", "version"])
def test_missing_release_version_is_rejected(field):
    invalid = chart()
    del invalid[field]
    with pytest.raises(ValueError, match="version"):
        scraper.parse_charts(index(chart(), invalid))


@pytest.mark.parametrize("suffix", ["-rc.1", "-beta.2+build.7", "-0"])
def test_recognized_prereleases_are_skipped(suffix):
    result = scraper.parse_charts(index(chart(), chart(app="v26.06.2" + suffix), chart(version="100.2606.2" + suffix)))
    assert result == [chart()]


@pytest.mark.parametrize("invalid", [chart(app="26.06.1-rc.1", version="broken"), chart(app="broken", version="100.2606.1-rc.1")])
def test_prerelease_does_not_hide_malformed_partner_version(invalid):
    with pytest.raises(ValueError, match="version"):
        scraper.parse_charts(index(chart(), invalid))


def test_conflicting_duplicate_is_rejected():
    with pytest.raises(ValueError, match="Conflicting"):
        scraper.parse_charts(index(chart(), chart(constraint=">=1.28.0")))


@pytest.mark.parametrize("content", ["[]", "entries: {}", "entries: {trident-operator: []}"])
def test_missing_index_is_rejected(content):
    with pytest.raises(ValueError):
        scraper.parse_charts(content)


def test_calver_normalization_preserves_original_tag_and_chart():
    urls = []
    def fetch(url):
        urls.append(url)
        return config()
    row = scraper.build_rows(index(chart()), fetch)[0]
    assert row["version"] == "26.6.1"
    assert row["chart_version"] == "100.2606.1"
    assert urls == [scraper.CONFIG_URL.format(version="26.06.1")]


def test_patch_level_support_change_survives_repository_reduction():
    charts = index(chart("24.10.0", "100.2410.0"), chart("24.10.1", "100.2410.1"))
    rows = scraper.build_rows(charts, lambda url: config("v1.25", "v1.32" if "24.10.1" in url else "v1.31"))
    reduced = reduce_versions(rows)
    assert len(reduced) == 2
    assert "1.32" in reduced[0]["kube"]
    assert "1.32" not in reduced[1]["kube"]


@pytest.mark.parametrize("failure", [None, "bad config", requests.Timeout("timeout")])
def test_fetch_or_parse_failure_never_calls_writer(failure):
    def fetch(url):
        if url == scraper.INDEX_URL:
            return index(chart(), chart("25.10.0", "100.2510.0"))
        if "26.06.1" in url:
            return config()
        if isinstance(failure, Exception):
            raise failure
        return failure
    with patch.object(scraper, "fetch_page", side_effect=fetch), patch.object(scraper, "update_compatibility_info") as write:
        scraper.scrape()
        write.assert_not_called()


def test_real_writer_preserves_metadata_and_is_idempotent(tmp_path):
    path = tmp_path / "trident-operator.yaml"
    metadata = {"icon": "https://example.org/icon.png", "git_url": "https://github.com/NetApp/trident", "versions": []}
    path.write_text(yaml.safe_dump(metadata))
    rows = scraper.build_rows(index(chart()), lambda url: config())
    with patch("utils.summarization_enabled", return_value=False):
        update_compatibility_info(str(path), rows)
        first = path.read_bytes()
        update_compatibility_info(str(path), rows)
    assert first == path.read_bytes()
    data = yaml.safe_load(first)
    assert data["icon"] == metadata["icon"]
    assert data["versions"][0]["version"] == "26.6.1"


def test_success_uses_standard_catalog_writer():
    with patch.object(scraper, "fetch_page", side_effect=[index(chart()), config()]), patch.object(scraper, "update_compatibility_info") as write:
        scraper.scrape()
        assert write.call_args.args[0] == "../../static/compatibilities/trident-operator.yaml"
        assert write.call_args.args[1][0]["version"] == "26.6.1"
