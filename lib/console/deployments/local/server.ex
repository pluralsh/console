defmodule Console.Deployments.Local.Server do
  use GenServer
  alias Console.Deployments.Local.Cache

  @timeout :timer.seconds(60)

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(:timer.minutes(5), :sweep)
    {:ok, Cache.new()}
  end

  def fetch(digest, reader) when is_function(reader, 0),
    do: GenServer.call(__MODULE__, {:fetch, digest, reader}, @timeout)

  def handle_call({:fetch, digest, reader}, _, cache) when is_function(reader, 0) do
    case Cache.fetch(cache, digest, reader) do
      {:ok, line, cache} -> {:reply, {:ok, line.file}, cache}
      err -> {:reply, err, cache}
    end
  end
  def handle_call(_, _, cache), do: {:reply, :ok, cache}

  def handle_info(:sweep, cache), do: {:noreply, Cache.sweep(cache)}
  def handle_info(_, cache), do: {:noreply, cache}
end
