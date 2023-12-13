defmodule Console.Cached.ClusterNodes do
  @moduledoc "this will perpertually warm the nebulex cache for cluster nodes locally"
  use GenServer
  require Logger
  alias Console.Deployments.{Cron}

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    if Console.conf(:initialize) do
      :timer.minutes(2)
      |> :timer.send_interval(:warm)
      send self(), :warm
    end
    {:ok, %{}}
  end

  def handle_info(:warm, s) do
    Logger.info "warming cluster info caches"
    try do
      Cron.cache_warm()
    rescue
      e ->
        Logger.info "hit error trying to warm node caches"
        Logger.error(Exception.format(:error, e, __STACKTRACE__))
    end
    {:noreply, s}
  end
end
