"""GitHub API failures must not erase kube compatibility data."""

from pathlib import Path
import sys
from unittest.mock import Mock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import utils


def response(status, body=None):
    return Mock(status_code=status, json=Mock(return_value=body))


@pytest.fixture(autouse=True)
def clear_cache():
    utils.get_kube_release_info.cache_clear()
    yield
    utils.get_kube_release_info.cache_clear()


def test_rate_limited_kube_releases_raise_and_are_not_cached(monkeypatch):
    get = Mock(return_value=response(403))
    monkeypatch.setattr(utils.requests, "get", get)
    with pytest.raises(Exception, match="403"):
        utils.get_kube_release_info()

    releases = [
        {"tag_name": "v1.36.0", "created_at": "2026-04-01T00:00:00Z"},
        {"tag_name": "v1.35.0", "created_at": "2025-12-01T00:00:00Z"},
    ]
    get.return_value = None
    get.side_effect = [response(200, releases), response(200, [])]
    assert [tag for tag, _ in utils.get_kube_release_info()] == ["v1.35.0", "v1.36.0"]


def test_empty_kube_list_does_not_overwrite_existing():
    existing = {"1.0.0": {"version": "1.0.0", "kube": ["1.36", "1.35"], "summary": "s"}}
    merged = utils.merge_versions(existing, [{"version": "1.0.0", "kube": []}])
    assert merged["1.0.0"]["kube"] == ["1.36", "1.35"]
    assert merged["1.0.0"]["summary"] == "s"


def test_github_headers_only_sent_to_api(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "token")
    assert utils.github_headers() == {"Authorization": "Bearer token"}
    assert utils.github_headers("https://raw.githubusercontent.com/x") == {}
