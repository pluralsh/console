defmodule Console.Deployments.Local.Server do
  use GenServer
  alias Console.SmartFile
  alias Console.Deployments.Local.Cache

  @type error :: Console.error

  @table_name :plrl_file_server
  @timeout :timer.seconds(60)

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(:timer.minutes(5), :sweep)
    table = :ets.new(@table_name, [:set, :protected, :named_table, read_concurrency: true])
    {:ok, Cache.new(table)}
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

  def handle_call({:proxy, digest, f}, _, %Cache{} = cache) do
    case Cache.proxy(cache, digest, f) do
      {:ok, line, cache} -> {:reply, {:ok, SmartFile.new(line.file)}, cache}
      err -> {:reply, err, cache}
    end
  end

  def handle_call({:fetch, digest, reader}, _, cache) when is_function(reader, 0) do
    case Cache.fetch(cache, digest, reader) do
      {:ok, line, cache} -> {:reply, {:ok, line.file}, cache}
      err -> {:reply, err, cache}
    end
  end

  def handle_call(:sweep, _, cache), do: {:reply, :ok, Cache.sweep(cache)}

  def handle_call({:open, f}, _, cache), do: {:reply, File.open(f), cache}

  def handle_call(_, _, cache), do: {:reply, :ok, cache}

  def handle_info(:sweep, cache), do: {:noreply, Cache.sweep(cache)}
  def handle_info(_, cache), do: {:noreply, cache}
end
