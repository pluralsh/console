defmodule Console.Deployments.Local.ServerTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Local.Server

  describe "#sweep/0" do
    test "it can sweep the cache" do
      f = Path.join(:code.priv_dir(:console), "agent-chart.tgz")
      {:ok, _} = Server.fetch("test", fn -> File.open(f) end)
      :ok = Server.sweep()
    end
  end
end
