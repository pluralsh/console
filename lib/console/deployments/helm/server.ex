defmodule Console.Deployments.Helm.Server do
  @moduledoc """
  Write-after cache for helm charts, meant to reduce load from the flux source controller which is technically a single-node
  server, the flow is:

  * read from cache if found immediately, never hit HTTP if so
  * if not present, read from http, write to disk, then defer a cast to the server to write a touch pointer
  * use same hourly timeout to expire using the touch pointers

  This is done by simply keeping the cache struct in a protected, named ets table.
  """
  use GenServer
  alias Kube.HelmChart
  alias Console.Deployments.Helm.Cache

  @table :helm_server

  @expiry :timer.minutes(60)

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@expiry, :expire)
    table = :ets.new(@table, [:named_table, :set, :protected])
    store_cache(table, Cache.new())
    {:ok, table}
  end

  def fetch(%HelmChart{} = chart) do
    with {:ok, cache} <- get_cache(),
         {:ok, f, _} <- Cache.fetch(cache, chart),
         _ <- GenServer.cast(__MODULE__, {:touch, chart}),
      do: {:ok, f}
  end

  def handle_cast({:touch, chart}, table) do
    with {:ok, cache} <- get_cache(table),
         {:ok, cache} <- Cache.touch(cache, chart),
      do: {:noreply, store_cache(table, cache)}
  end

  def handle_call({:fetch, chart}, table) do
    with {:ok, cache} <- get_cache(table),
         {:ok, f, cache} <- Cache.fetch(cache, chart),
      do: {:reply, {:ok, f}, store_cache(table, cache)}
  end

  def handle_info(:expire, table) do
    with {:ok, cache} <- get_cache(table),
      do: {:noreply, store_cache(table, Cache.refresh(cache))}
  end
  def handle_info(_, table), do: {:noreply, table}

  defp get_cache(table \\ @table) do
    case :ets.lookup(table, :cache) do
      [{:cache, cache}] -> {:ok, cache}
      _ -> {:error, "could not get helm cache"}
    end
  end

  defp store_cache(table, cache) do
    :ets.insert(table, {:cache, cache})
    table
  end
end
