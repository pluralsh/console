defmodule Console.Deployments.Tar do
  @type err :: Console.error

  @doc """
  Streams a tar from a url to a local file and returns a handle
  """
  @spec from_url(binary) :: {:ok, File.t} | err
  def from_url(url) do
    stream = HTTPStream.get(url)
    with {:ok, tmp} <- Briefly.create(),
         :ok <- Stream.into(stream, File.stream!(tmp)) |> Stream.run(),
      do: File.open(tmp)
  end

  @doc """
  Converts a list of tar contents to a new tarball file and returns a working handle
  """
  @spec tarball([{binary, binary}]) :: {:ok, File.t} | err
  def tarball(contents) do
    with {:ok, tmp} <- Briefly.create(),
         :ok <- tarball(tmp, contents),
      do: File.open(tmp)
  end

  @spec tarball(binary, [{binary, binary}]) :: :ok | err
  def tarball(file, contents) do
    tar_contents = Enum.map(contents, fn {p, c} -> {to_charlist(p), c} end)
    to_charlist(file)
    |> :erl_tar.create(tar_contents, [:compressed])
  end

  @doc """
  Takes a tar file and adds a set of additional files to it, then returns a new file handle to it
  """
  @spec splice(File.t, map) :: {:ok, File.t} | err
  def splice(tar_file, additional) do
    with {:ok, contents} <- tar_stream(tar_file) do
      Map.new(contents)
      |> Map.merge(additional)
      |> Map.to_list()
      |> tarball()
    end
  end

  @doc """
  Streams a tar from an open file and returns a list of file names/contents
  """
  @spec tar_stream(File.t) :: {:ok, [{binary, binary}]} | err
  def tar_stream(tar_file) do
    try do
      with {:ok, tmp} <- Briefly.create(),
            _ <- IO.binstream(tar_file, 1024) |> Enum.into(File.stream!(tmp)),
           {:ok, res} <- :erl_tar.extract(tmp, [:compressed, :memory]),
        do: {:ok, Enum.map(res, fn {name, content} -> {to_string(name), to_string(content)} end)}
    after
      File.close(tar_file)
    end
  end
end
