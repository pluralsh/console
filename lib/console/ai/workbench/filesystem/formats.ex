defmodule Console.AI.Workbench.Filesystem.Formats do
  @moduledoc """
  Parsers and encoders for structured file formats monty's standard library lacks (csv, yaml),
  returning python-friendly values for the sandbox.
  """

  @max_errors 10

  @doc "the default delimiter for a file, tab for .tsv/.tab files and a comma otherwise"
  @spec delimiter(binary | nil) :: binary
  def delimiter(path) when is_binary(path) do
    case Path.extname(path) |> String.downcase() do
      ext when ext in ~w(.tsv .tab) -> "\t"
      _ -> ","
    end
  end
  def delimiter(_), do: ","

  @doc """
  Parses csv text.  With a header row, rows are dicts keyed by column (missing cells are `None`,
  extra cells are collected under `"_extra"`), otherwise they're lists.  Malformed rows are skipped
  and reported in `errors`.
  """
  @spec parse_csv(binary, keyword) :: {:ok, map} | {:error, atom, binary}
  def parse_csv(text, opts \\ []) do
    with {:ok, sep} <- separator(Keyword.get(opts, :delimiter, ",")) do
      {rows, errors} =
        [String.trim_leading(text, "\uFEFF")]
        |> CSV.decode(separator: sep)
        |> Enum.reduce({[], []}, fn
          {:ok, row}, {rows, errs} -> {[row | rows], errs}
          {:error, err}, {rows, errs} -> {rows, [String.trim(err) | errs]}
        end)

      rows
      |> Enum.reverse()
      |> Enum.reject(&(&1 == [""]))
      |> tabulate(Keyword.get(opts, :header, true), Keyword.get(opts, :max_rows))
      |> Map.put("errors", Enum.reverse(errors) |> Enum.take(@max_errors))
      |> then(&{:ok, &1})
    end
  end

  defp tabulate([columns | rows], true, max) do
    rows
    |> limit(max)
    |> Map.update!("rows", fn rows -> Enum.map(rows, &record(columns, &1)) end)
    |> Map.put("columns", columns)
  end
  defp tabulate([], true, _), do: %{"columns" => [], "rows" => [], "row_count" => 0, "truncated" => false}
  defp tabulate(rows, _, max), do: Map.put(limit(rows, max), "columns", nil)

  defp limit(rows, max) when is_integer(max) and max >= 0 do
    count = length(rows)
    %{"rows" => Enum.take(rows, max), "row_count" => count, "truncated" => count > max}
  end
  defp limit(rows, _), do: %{"rows" => rows, "row_count" => length(rows), "truncated" => false}

  defp record(columns, row) do
    {cells, extra} = Enum.split(row, length(columns))
    cells = cells ++ List.duplicate(nil, length(columns) - length(cells))
    record = Enum.zip(columns, cells) |> Map.new()
    case extra do
      [] -> record
      extra -> Map.put(record, "_extra", extra)
    end
  end

  @doc """
  Encodes rows (a list of dicts or of lists) as csv.  Columns default to the keys of dict rows in
  the order they're first seen, and are written as a header row when present.
  """
  @spec encode_csv(list, list | nil, binary) :: {:ok, binary} | {:error, atom, binary}
  def encode_csv(rows, columns, delimiter) when is_list(rows) do
    with {:ok, sep} <- separator(delimiter),
         {:ok, columns, rows} <- matrix(rows, columns) do
      Enum.concat(List.wrap(columns && [columns]), rows)
      |> Enum.map(fn row -> Enum.map(row, &cell/1) end)
      |> CSV.encode(separator: sep, delimiter: "\n")
      |> Enum.join()
      |> then(&{:ok, &1})
    end
  end
  def encode_csv(_, _, _), do: {:error, :type_error, "rows must be a list of dicts or lists"}

  defp matrix(rows, columns) do
    cond do
      Enum.all?(rows, &is_map/1) ->
        columns = columns || rows |> Enum.flat_map(&Map.keys/1) |> Enum.uniq()
        {:ok, columns, Enum.map(rows, fn row -> Enum.map(columns, &Map.get(row, &1)) end)}
      Enum.all?(rows, &is_list/1) ->
        {:ok, columns, rows}
      true ->
        {:error, :type_error, "rows must all be dicts or all be lists"}
    end
  end

  defp cell(nil), do: ""
  defp cell(true), do: "True"
  defp cell(false), do: "False"
  defp cell(v) when is_binary(v), do: v
  defp cell(v) when is_number(v) or is_atom(v), do: to_string(v)
  defp cell(v) when is_map(v) or is_list(v), do: Jason.encode!(v)
  defp cell(v), do: inspect(v)

  defp separator(<<c::utf8>>), do: {:ok, c}
  defp separator(_), do: {:error, :value_error, "delimiter must be a single character"}

  @doc "parses yaml text into a list of its documents"
  @spec parse_yaml(binary) :: {:ok, list} | {:error, atom, binary}
  def parse_yaml(text) do
    case Console.Utils.Yaml.decode_all(text) do
      {:ok, docs} -> {:ok, Enum.map(docs, &pythonize/1)}
      {:error, msg} -> {:error, :value_error, "invalid yaml: #{msg}"}
    end
  end

  defp pythonize(m) when is_map(m), do: Map.new(m, fn {k, v} -> {pythonize(k), pythonize(v)} end)
  defp pythonize(l) when is_list(l), do: Enum.map(l, &pythonize/1)
  defp pythonize(v) when is_boolean(v) or is_nil(v), do: v
  defp pythonize(v) when is_atom(v), do: Atom.to_string(v)
  defp pythonize(v), do: v
end
