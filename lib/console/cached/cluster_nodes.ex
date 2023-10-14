defmodule Console.Cached.ClusterNodes do
  @moduledoc "this will perpertually warm the nebulex cache for cluster nodes locally"
  use GenServer
  alias Console.Deployments.{Cron, Clusters}

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    if Console.conf(:initialize) do
      Clusters.node_ttl()
      |> :timer.send_interval(:warm)
    end
    {:ok, %{}}
  end

  def handle_info(:warm, s) do
    Cron.cache_warm()
    {:noreply, s}
  end
end
