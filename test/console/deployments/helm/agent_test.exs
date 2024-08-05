defmodule Console.Deployments.Helm.AgentTest do
  use Console.DataCase, async: false
  alias Console.Deployments.Helm.Agent

  describe "#start/1" do
    test "it can fetch a chart and version" do
      repo = "https://pluralsh.github.io/console"
      {:ok, pid} = Agent.start(repo)

      {:ok, f, _} = Agent.fetch(pid, "console", "0.3.15")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]

      assert Console.Deployments.Git.get_helm_repository(repo).health == :pullable

      Process.exit(pid, :kill)
    end

    test "it can fetch a chart from an oci registry" do
      repo = "oci://ghcr.io/stefanprodan/charts"
      {:ok, pid} = Agent.start(repo)

      {:ok, f, _} = Agent.fetch(pid, "podinfo", "x.x.x")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]
      {:ok, _} = YamlElixir.read_from_string(files["Chart.yaml"])

      assert Console.Deployments.Git.get_helm_repository(repo).health == :pullable

      Process.exit(pid, :kill)
    end

    test "it can fetch a chart by floating version" do
      repo = "https://pluralsh.github.io/console"
      {:ok, pid} = Agent.start(repo)

      {:ok, f, _} = Agent.fetch(pid, "console", "0.x.x")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]

      {:ok, chart} = YamlElixir.read_from_string(files["Chart.yaml"])
      assert Version.compare(chart["appVersion"], "0.10.0") == :gt

      assert Console.Deployments.Git.get_helm_repository(repo).health == :pullable

      Process.exit(pid, :kill)
    end
  end

  defp stream_and_untar(f) do
    {:ok, tmp} = Briefly.create()
    IO.binstream(f, 1024)
    |> Enum.into(File.stream!(tmp))
    File.close(f)

    {:ok, res} = :erl_tar.extract(tmp, [:compressed, :memory])
    Enum.into(res, %{}, fn {name, content} -> {to_string(name), to_string(content)} end)
  end
end
