defmodule Console.Utils.Yaml do
  @moduledoc """
  YAML helpers. Decoding uses yaml_rustler's NIF, which moves large documents onto a dirty scheduler.
  """

  def format(m) when is_map(m) do
    with {:ok, doc} <- Ymlr.document(m),
      do: {:ok, String.trim_leading(doc, "---\n")}
  end

  @doc "decodes the first document in `str`, an empty document decodes to an empty map"
  @spec decode(binary) :: {:ok, term} | {:error, binary}
  def decode(str) when is_binary(str) do
    case YamlRustler.parse(str) do
      {:ok, nil} -> {:ok, %{}}
      res -> res
    end
  end

  @doc "decodes every document in a stream, empty documents decode to empty maps"
  @spec decode_all(binary) :: {:ok, [term]} | {:error, binary}
  def decode_all(str) when is_binary(str) do
    with {:ok, docs} <- YamlRustler.parse_all(str),
      do: {:ok, Enum.map(docs, &(&1 || %{}))}
  end

  @spec decode_file(Path.t) :: {:ok, term} | {:error, term}
  def decode_file(path) do
    with {:ok, str} <- File.read(path),
      do: decode(str)
  end
end
