defmodule Console.Deployments.Tar do
  @type err :: Console.error

  @doc """
  Takes a tar file and adds a set of additional files to it, then returns a new file handle to it
  """
  @spec splice(File.t, map) :: {:ok, File.t} | err
  def splice(tar_file, additional) do
    with {:ok, tmp} <- Briefly.create(),
         {:ok, contents} <- tar_stream(tar_file) do
      contents = Map.new(contents) |> Map.merge(additional)
      tar_contents = Enum.map(contents, fn {p, c} -> {to_charlist(p), c} end)
      to_charlist(tmp)
      |> :erl_tar.create(tar_contents, [:compressed])
      |> case do
        :ok -> File.open(tmp)
        error -> error
      end
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
