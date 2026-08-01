defmodule Console.Deployments.Local.Server do
  use GenServer
  alias Console.SmartFile
  alias Console.Deployments.Local.Cache
  alias Console.Deployments.Local.PersistentEts

  @type error :: Console.error

  @table_name :plrl_file_server
  @timeout :timer.seconds(60)
  @flush_interval :timer.seconds(10)

  defmodule State do
    defstruct [:cache, :table]
  end

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    dir = server_dir()
    :timer.send_interval(:timer.minutes(5), :sweep)

    table = PersistentEts.new(
      @table_name,
      Path.join(dir, "local.tab"),
      [:set, :protected, :named_table, read_concurrency: true],
      flush_interval: @flush_interval
    )

    {:ok, %State{cache: Cache.new(table.table, dir), table: table}}
  end

  @doc """
  Small genserver wrapper on open to solve for the fact file handles are linked to the calling process,
  and so we need a long lived process to ensure safe handoff.
  """
  @spec open(binary) :: {:ok, File.t} | error
  def open(path), do: GenServer.call(__MODULE__, {:open, path})

  def opener(path), do: fn -> open(path) end

  def sweep(), do: GenServer.call(__MODULE__, :sweep)

  @spec proxy(binary, SmartFile.eligible) :: {:ok, SmartFile.t} | error
  def proxy(digest, f) do
    case Cache.find(@table_name, digest) do
      %Cache.Line{file: fname} -> {:ok, SmartFile.new(fname)}
      _ -> GenServer.call(__MODULE__, {:proxy, digest, f}, @timeout)
    end
  end

  @spec fetch(binary, function) :: {:ok, SmartFile.t} | error
  def fetch(digest, reader) when is_function(reader, 0) do
    with nil <- Cache.find(@table_name, digest),
         {:ok, f} <- reader.() do
      GenServer.call(__MODULE__, {:proxy, digest, f}, @timeout)
    else
      %Cache.Line{file: fname} -> {:ok, SmartFile.new(fname)}
      err -> err
    end
  end

  @spec fetch_with_sha(binary, function) :: {:ok, SmartFile.t, binary} | error
  def fetch_with_sha(digest, reader) when is_function(reader, 0) do
    with nil <- Cache.find(@table_name, digest),
         {:ok, f, sha} <- reader.(),
         {:ok, sf} <- GenServer.call(__MODULE__, {:proxy, digest, f}, @timeout) do
      {:ok, sf, sha}
    else
      %Cache.Line{file: fname} -> {:ok, SmartFile.new(fname), digest}
      err -> err
    end
  end

  def handle_call({:proxy, digest, f}, _, %State{cache: cache} = state) do
    case Cache.proxy(cache, digest, f) do
      {:ok, line, cache} -> {:reply, {:ok, SmartFile.new(line.file)}, %{state | cache: cache}}
      err -> {:reply, err, state}
    end
  end

  def handle_call({:fetch, digest, reader}, _, %State{cache: cache} = state)
      when is_function(reader, 0) do
    case Cache.fetch(cache, digest, reader) do
      {:ok, line, cache} -> {:reply, {:ok, line.file}, %{state | cache: cache}}
      err -> {:reply, err, state}
    end
  end

  def handle_call(:sweep, _, %State{cache: cache} = state),
    do: {:reply, :ok, %{state | cache: Cache.sweep(cache)}}
  def handle_call({:open, f}, _, state), do: {:reply, File.open(f), state}
  def handle_call(_, _, state), do: {:reply, :ok, state}

  def handle_info(:sweep, %State{cache: cache} = state),
    do: {:noreply, %{state | cache: Cache.sweep(cache)}}
  def handle_info({:persistent_ets, :flush}, %State{table: table} = state) do
    PersistentEts.flush(table)
    {:noreply, state}
  end
  def handle_info(_, state), do: {:noreply, state}

  if Mix.env() == :test do
    # assists in cleanup for local envs, in prod, emptyDir handles this
    defp server_dir(), do: Briefly.create!(directory: true)
  else
    defp server_dir(), do: File.mkdir_p!(Path.join([System.tmp_dir!, "local_server"]))
  end
end
