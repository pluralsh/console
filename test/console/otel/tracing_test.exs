defmodule Console.Otel.TracingTest do
  use ExUnit.Case, async: true
  alias Console.Otel.Tracing

  describe "span/3" do
    test "returns the wrapped result" do
      assert Tracing.span("test.span", %{"k" => "v"}, fn -> {:ok, :done} end) == {:ok, :done}
    end

    test "omits nil attributes" do
      assert Tracing.span("test.span", %{"k" => nil, "keep" => "v"}, fn -> :ok end) == :ok
    end

    test "does not raise when url attributes contain credentials" do
      attrs = %{
        "git.repository.url" => "https://user:pass@github.com/org/repo.git",
        "helm.repository.url" => "https://charts.example.com/index.yaml?sig=secret"
      }

      assert Tracing.span("test.span", attrs, fn -> :ok end) == :ok
    end
  end

  describe "sanitize_url/1" do
    test "strips userinfo from https git URLs" do
      assert Tracing.sanitize_url("https://user:pass@github.com/org/repo.git") ==
               "https://github.com/org/repo.git"

      assert Tracing.sanitize_url("https://x-access-token:ghs_secret@github.com/org/repo.git") ==
               "https://github.com/org/repo.git"
    end

    test "strips signed query parameters and fragments" do
      assert Tracing.sanitize_url("https://charts.example.com/index.yaml?sig=abc&token=secret") ==
               "https://charts.example.com/index.yaml"

      assert Tracing.sanitize_url("https://example.com/charts#token=abc") ==
               "https://example.com/charts"
    end

    test "keeps non-default ports and clean URLs" do
      assert Tracing.sanitize_url("https://example.com:8443/charts") ==
               "https://example.com:8443/charts"

      assert Tracing.sanitize_url("https://github.com/org/repo.git") ==
               "https://github.com/org/repo.git"
    end

    test "strips userinfo from oci and ssh URLs" do
      assert Tracing.sanitize_url("oci://user:token@ghcr.io/org/chart") ==
               "oci://ghcr.io/org/chart"

      assert Tracing.sanitize_url("ssh://git@github.com/org/repo.git") ==
               "ssh://github.com/org/repo.git"
    end

    test "redacts scp-style git remotes to host/path" do
      assert Tracing.sanitize_url("git@github.com:org/repo.git") ==
               "github.com/org/repo.git"

      assert Tracing.sanitize_url("user:pass@github.com:org/repo.git") ==
               "github.com/org/repo.git"

      assert Tracing.sanitize_url("git@github.com:org/repo.git?token=secret") ==
               "github.com/org/repo.git"
    end

    test "drops unparseable values that still look secret" do
      assert Tracing.sanitize_url("not a url but user@secret") == nil
    end

    test "returns nil for blank values" do
      assert Tracing.sanitize_url(nil) == nil
      assert Tracing.sanitize_url("") == nil
    end
  end
end
