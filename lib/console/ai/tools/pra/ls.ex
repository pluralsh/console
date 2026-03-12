defmodule Console.AI.Tools.Pra.Ls do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Pra.Utils

  embedded_schema do
    field :dir,   :string, virtual: true
    field :path,  :string
    field :regex, :string
  end

  @schema Console.priv_file!("tools/pra/ls.json") |> Jason.decode!()

  def name(_), do: "pra_ls"
  def description(_), do: "Lists the contents of a directory, with optional search to filter only files with matching content"
  def json_schema(_), do: @schema

  @valid ~w(path regex)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:path])
  end

  def implement(_, %__MODULE__{dir: dir, path: path, regex: regex}) do
    with {:ok, path} <- relpath(dir, path) do
      maybe_wildcard(path)
      |> maybe_filter(regex)
      |> relative_paths(dir)
    end
  end

  defp maybe_wildcard(path) do
    case String.contains?(path, "*") do
      true -> Path.wildcard(path)
      false -> Console.ls_r(path)
    end
  end

  defp maybe_filter(paths, regex) when is_binary(regex) and byte_size(regex) > 0 do
    with {:ok, regex} <- Regex.compile(regex, multiline: true) do
      Enum.filter(paths, fn path ->
        File.read!(path)
        |> then(&Regex.match?(regex, &1))
      end)
    end
  end
  defp maybe_filter(paths, _), do: paths

  defp relative_paths(paths, dir) when is_list(paths) do
    Enum.map(paths, &Path.relative_to(&1, dir))
    |> Enum.sort()
    |> then(& {:ok, &1})
  end
end
