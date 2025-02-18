defmodule Console.Deployments.Local.Cache do
  @type t :: %__MODULE__{cache: %{binary => Line.t}}

  defstruct [:dir, cache: %{}]

  defmodule Line do
    @type t :: %__MODULE__{}

    @expiry [minutes: -2 * 60]
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

  @spec new() :: t
  def new() do
    {:ok, dir} = Briefly.create(directory: true)
    %__MODULE__{dir: dir, cache: %{}}
  end

  @spec fetch(t, binary, function) :: {:ok, Line.t, t} | Console.error
  def fetch(%__MODULE__{cache: lines} = cache, digest, reader) when is_function(reader, 0) do
    case lines[digest] do
      %Line{} = l -> {:ok, l, put_in(cache.cache[digest], Line.touch(l))}
      nil -> write(cache, digest, reader)
    end
  end

  @spec write(t, binary, function) :: {:ok, Line.t, t} | Console.error
  def write(%__MODULE__{} = cache, digest, reader) when is_function(reader, 0) do
    path = Path.join(cache.dir, "#{digest}.tgz")
    with %File.Stream{} <- safe_copy(path, reader),
         line <- Line.new(path, digest),
      do: {:ok, line, put_in(cache.cache[digest], line)}
  end

  @spec sweep(t) :: t
  def sweep(%__MODULE__{cache: lines} = cache) do
    {keep, expire} = Enum.split_with(lines, fn {_, l} -> !Line.expired?(l) end)
    Enum.each(expire, fn {_, v} -> Line.expire(v) end)
    %{cache | cache: Map.new(keep)}
  end

  defp safe_copy(path, reader) when is_function(reader, 0) do
    with {:ok, f} <- reader.() do
      try do
        IO.binstream(f, Console.conf(:chunk_size))
        |> Enum.into(File.stream!(path))
      after
        File.close(f)
      end
    end
  end
end
