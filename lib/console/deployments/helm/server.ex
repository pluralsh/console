defmodule Console.Deployments.Helm.Server do
  use GenServer
  alias Kube.HelmChart
  alias Console.Deployments.Helm.Cache

  @expiry :timer.minutes(60)
  @timeout :timer.seconds(30)

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@expiry, :expire)
    {:ok, Cache.new()}
  end

  def fetch(%HelmChart{} = chart), do: GenServer.call(__MODULE__, {:fetch, chart}, @timeout)

  def handle_call({:fetch, chart}, _, cache) do
    with {:ok, f, cache} <- Cache.fetch(cache, chart),
      do: {:reply, {:ok, f}, cache}
  end

  def handle_info(:expire, cache), do: {:noreply, Cache.refresh(cache)}
  def handle_info(_, cache), do: {:noreply, cache}
end
