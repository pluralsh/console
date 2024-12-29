defmodule Console.AI.Fixer.Base do
  use Console.AI.Evidence.Base
  alias Console.Deployments.Tar
  alias Console.Schema.Service

  @extension_blacklist ~w(.tgz .png .jpeg .jpg .gz .tar .zip .tar.gz)

  @format ~s({"file": string, "content": string})
  @preface "I'll list the relevant source code for you in JSON format, with the structure #{@format}"

  @encode_key {__MODULE__, :noencode}

  def raw(), do: Process.put(@encode_key, true)

  def raw?(), do: !!Process.get(@encode_key)

  def file_fmt(), do: @format

  def folder(%Service{git: %Service.Git{folder: folder}}) when is_binary(folder), do: folder
  def folder(_), do: ""

  def code_prompt(f, subfolder, preface \\ @preface) do
    with {:ok, contents} <- Tar.tar_stream(f) do
      Enum.filter(contents, & !blacklist(elem(&1, 0)))
      |> Enum.map(fn {p, content} -> {:user, maybe_encode(%{file: Path.join(subfolder, p), content: content})} end)
      |> prepend({:user, preface})
      |> ok()
    end
  end

  defp maybe_encode(map) do
    case raw?() do
      true -> map
      _ -> Jason.encode!(map)
    end
  end

  defp blacklist(filename) do
    cond do
      String.ends_with?(filename, "values.yaml.static") -> true
      Path.extname(filename) in @extension_blacklist -> true
      true -> false
    end
  end
end
