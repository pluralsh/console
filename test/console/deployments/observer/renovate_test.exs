defmodule Console.Deployments.Observer.Poller.RenovateTest do
  use ExUnit.Case, async: true

  alias Console.Deployments.Observer.Poller.Renovate
  alias Console.Schema.Observer

  describe "sort/3" do
    test "sorts default semver-ish versions with omitted parts defaulting to zero" do
      assert Renovate.sort(
        ["1.0.1", "1.2", "1.0.0", "2", "1.2.1", "invalid"],
        target()
      ) == ["2", "1.2.1", "1.2", "1.0.1", "1.0.0"]
    end

    test "sorts custom renovate regex captures through build and revision" do
      format = "^release-(?<major>\\d+)\\.(?<minor>\\d+)(?:\\.(?<patch>\\d+))?(?:\\+(?<build>\\d+)-r(?<revision>\\d+))?$"

      assert Renovate.sort(
        ["release-1.2+2-r0", "release-1.2.1+1-r2", "release-1.2.1+1-r1", "release-1.3"],
        target(format: format)
      ) == ["release-1.3", "release-1.2.1+1-r2", "release-1.2.1+1-r1", "release-1.2+2-r0"]
    end

    test "filters prerelease captures when ignore unstable is enabled" do
      assert Renovate.sort(
        ["1.1.0-alpha", "1.0.9", "1.1.0-rc1"],
        target(ignore_unstable: true)
      ) == ["1.0.9"]
    end

    test "keeps prerelease captures when ignore unstable is disabled" do
      assert Renovate.sort(
        ["1.1.0-alpha", "1.0.9", "1.1.0"],
        target(ignore_unstable: false)
      ) == ["1.1.0", "1.1.0-alpha", "1.0.9"]
    end

    test "filters updates that change captured compatibility from the last value" do
      format = "^(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)-(?<compatibility>[a-z]+)(?<build>\\d+)$"

      assert Renovate.sort(
        ["2.0.0-osx1", "1.3.0-linux2", "1.2.1-linux3", "1.4.0-windows1"],
        target(format: format),
        "1.2.0-linux1"
      ) == ["1.3.0-linux2", "1.2.1-linux3"]
    end
  end

  describe "compare/3" do
    test "compares omitted semver-ish values as zeros" do
      assert Renovate.compare("1.2.1", "1.2", target()) == :gt
      assert Renovate.compare("1.2", "1.2.1", target()) == :lt
    end

    test "rejects incompatible updates" do
      format = "^(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)-(?<compatibility>[a-z]+)$"

      assert Renovate.compare("2.0.0-osx", "1.0.0-linux", target(format: format)) == :lt
    end
  end

  defp target(opts \\ []) do
    %Observer.Target{
      order: :renovate,
      format: Keyword.get(opts, :format),
      renovate: %Observer.Target.Renovate{
        ignore_unstable: Keyword.get(opts, :ignore_unstable)
      }
    }
  end
end
