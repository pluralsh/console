defmodule Console.Deployments.Local.Cache do
  alias Console.SmartFile
  require Logger

  @type t :: %__MODULE__{}

  defstruct [:dir, :table]

  defmodule Line do
    @type t :: %__MODULE__{}

    @expiry [minutes: :timer.minutes(5 * 60)]
    defstruct [:file, :digest, :touched]

    def new(file, digest) do
      %__MODULE__{
        file: file,
        digest: digest,
        touched: Timex.now()
      }
    end

    def touch(%__MODULE__{} = mod), do: %{mod | touched: Timex.now()}

    def expire(%__MODULE__{file: f}), do: File.rm(f)

    def expired?(%__MODULE__{touched: touched}) do
      Timex.now()
      |> Timex.shift(@expiry)
      |> Timex.after?(touched)
    end
  end

  @spec new(:ets.tab()) :: t
  def new(table) do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{dir: dir, table: table}
  end

  @spec fetch(t, binary, function) :: {:ok, Line.t, t} | Console.error
  def fetch(%__MODULE__{} = cache, digest, reader) when is_function(reader, 0) do
    case find(cache, digest) do
      %Line{} = l -> {:ok, l, store(cache, Line.touch(l))}
      nil -> write(cache, digest, reader)
    end
  end

  @spec proxy(t, binary, pid) :: {:ok, Line.t, t} | Console.error
  def proxy(%__MODULE__{} = cache, digest, file) do
    with %Line{} = l <- find(cache, digest),
         :ok <- SmartFile.close(file) do
      {:ok, l, store(cache, Line.touch(l))}
    else
      nil -> write(cache, digest, fn -> {:ok, file} end)
      err -> err
    end
  end

  @spec write(t, binary, function) :: {:ok, Line.t, t} | Console.error
  def write(%__MODULE__{} = cache, digest, reader) when is_function(reader, 0) do
    path = Path.join(cache.dir, "#{digest}.tgz")
    with %File.Stream{} <- safe_copy(path, reader),
         line <- Line.new(path, digest),
      do: {:ok, line, store(cache, line)}
  end

  @spec sweep(t) :: t
  def sweep(%__MODULE__{table: t} = cache) do
    deleted = :ets.foldl(t, fn {k, l}, acc ->
      case Line.expired?(l) do
        true ->
          :ets.delete(t, k)
          acc + 1
        _ -> acc
      end
    end, 0)
    Logger.info("pruned #{deleted} expired files from local file server")
    cache
  end

  defp safe_copy(path, reader) when is_function(reader, 0) do
    with {:ok, file} <- reader.(),
         smart <- SmartFile.new(file),
         {:ok, f} <- SmartFile.convert(smart) do
      try do
        IO.binstream(f, Console.conf(:chunk_size))
        |> Enum.into(File.stream!(path))
      after
        File.close(f)
      rescue
        err ->
          Logger.error(Exception.format(:error, err, __STACKTRACE__))
          {:error, :stream_aborted}
      end
    end
  end

  def find(%__MODULE__{table: table}, digest), do: find(table, digest)
  def find(table, digest) do
    case :ets.lookup(table, {:line, digest}) do
      [{:line, line}] -> line
      _ -> nil
    end
  end

  defp store(%__MODULE__{table: table} = cache, %Line{digest: digest} = line) do
    :ets.insert(table, {:line, digest, line})
    cache
  end
end
