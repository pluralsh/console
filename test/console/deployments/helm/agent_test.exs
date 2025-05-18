defmodule Console.Deployments.Helm.AgentTest do
  use Console.DataCase, async: false
  alias Console.Deployments.Helm.Agent

  describe "#start/1" do
    test "it can fetch a chart and version and a floating version" do
      # with the current caching structure it's actually important this is a distinct chart repo from
      # other tests, otherwise it'll just use a lingering agent and its ets entries that hasn't been reaped in the full test suite
      repo = "https://pluralsh.github.io/deployment-operator"
      {:ok, pid} = Agent.start(repo) |> handle()

      {:ok, f, _, _} = Agent.fetch(pid, "deployment-operator", "0.5.25")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]

      {:ok, f, _, _} = Agent.fetch(pid, "deployment-operator", "0.x.x")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]

      {:ok, chart} = YamlElixir.read_from_string(files["Chart.yaml"])
      assert Version.compare(chart["appVersion"], "0.5.20") == :gt

      git = Console.Deployments.Git.get_helm_repository(repo)
      assert git
      assert git.health == :pullable

      Process.exit(pid, :kill)
    end

    test "it can handle problem with yaml responses and json content types" do
      repo = "https://pkgs.tailscale.com/helmcharts"
      {:ok, pid} = Agent.start(repo) |> handle()

      {:ok, f, _, _} = Agent.fetch(pid, "tailscale-operator", "x.x.x")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]

      assert Console.Deployments.Git.get_helm_repository(repo).health == :pullable

      Process.exit(pid, :kill)
    end

    test "it can handle shitty azure helm repos" do
      repo = "https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/charts"
      {:ok, pid} = Agent.start(repo) |> handle()

      {:ok, f, _, _} = Agent.fetch(pid, "azure-service-operator", "x.x.x")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]

      assert Console.Deployments.Git.get_helm_repository(repo).health == :pullable

      Process.exit(pid, :kill)
    end

    test "it can handle https chart museum helm repos" do
      repo = "https://app.plural.sh/cm/rabbitmq"
      {:ok, pid} = Agent.start(repo) |> handle()

      {:ok, f, _, _} = Agent.fetch(pid, "cluster-operator", "x.x.x")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]

      assert Console.Deployments.Git.get_helm_repository(repo).health == :pullable

      Process.exit(pid, :kill)
    end

    test "it can fetch a chart from an oci registry" do
      repo = "oci://ghcr.io/stefanprodan/charts"
      {:ok, pid} = Agent.start(repo) |> handle()

      {:ok, f, _, _} = Agent.fetch(pid, "podinfo", "x.x.x")

      files = stream_and_untar(f)
      assert files["Chart.yaml"]
      {:ok, _} = YamlElixir.read_from_string(files["Chart.yaml"])

      assert Console.Deployments.Git.get_helm_repository(repo).health == :pullable

      Process.exit(pid, :kill)
    end

    test "it can properly error on invalid charts" do
      repo = "oci://ghcr.io/stefanprodan/charts"
      {:ok, pid} = Agent.start(repo) |> handle()

      {:error, "error fetching" <> _} = Agent.fetch(pid, "incorrect", "x.x.x")

      Process.exit(pid, :kill)
    end
  end

  defp stream_and_untar(f) do
    {:ok, f} = f.()
    {:ok, tmp} = Briefly.create()
    IO.binstream(f, 1024)
    |> Enum.into(File.stream!(tmp))
    File.close(f)

    {:ok, res} = :erl_tar.extract(tmp, [:compressed, :memory])
    Enum.into(res, %{}, fn {name, content} -> {to_string(name), to_string(content)} end)
  end

  defp handle({:error, {:already_started, pid}}), do: {:ok, pid}
  defp handle({:ok, pid}), do: {:ok, pid}
  defp handle(err), do: err
end
