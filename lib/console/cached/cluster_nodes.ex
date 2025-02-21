defmodule Console.Cached.ClusterNodes do
  @moduledoc "this will perpertually warm the nebulex cache for cluster nodes locally"
  use GenServer
  require Logger

  @metrics_ttl Console.conf(:ttls)[:cluster_metrics]
  @helm_ttl Console.conf(:ttls)[:helm]
  @local_adapter Console.conf(:local_cache)

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def broadcast(msg) do
    :pg.get_members(__MODULE__)
    |> Enum.each(&GenServer.cast(&1, {:broadcast, msg}))
  end

  def cluster_metrics(id, metrics), do: broadcast({:cluster_metrics, id, metrics})

  def helm_repos(repos), do: broadcast({:helm_repos, repos})

  def init(_) do
    :pg.join(__MODULE__, self())
    {:ok, %{}}
  end

  def handle_cast({:broadcast, {:cluster_metrics, id, metrics}}, s) do
    @local_adapter.put({:cluster_metrics, id}, {:ok, metrics}, ttl: @metrics_ttl)
    {:noreply, s}
  end

  def handle_cast({:broadcast, {:helm_repos, repos}}, s) do
    @local_adapter.put(:helm_repositories, repos, ttl: @helm_ttl)
    {:noreply, s}
  end

  def handle_cast(_, s), do: {:noreply, s}
end
