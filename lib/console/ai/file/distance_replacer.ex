defmodule Console.AI.File.DistanceReplacer do
  @threshold 0.75

  @type edit_result :: {float, integer, integer}

  @spec replace(original :: [binary], plines :: [binary], previous :: binary, replacement :: [binary]) :: {:ok, binary} | {:error, binary}
  def replace(original, plines, previous, replacement) do
    case closest_subsection(original, plines, previous) do
      {d, i, j} when d >= @threshold -> do_replace(original, replacement, i, j)
      _ -> {:error, "could not find a suitable replacement with sufficiently small edit distance"}
    end
  end

  defp closest_subsection(original, plines, previous) do
    len = length(plines)

    Enum.map((floor(len * 0.9))..(ceil(len * 1.1)), &find_edit_distance(original, previous, &1))
    |> Enum.filter(& &1)
    |> Enum.max_by(fn {d, _, _} -> d end, fn -> nil end)
  end

  defp do_replace(original, replacement, i, j) do
    lines = Enum.take(original, i) ++ replacement ++ Enum.drop(original, j)
    {:ok, Enum.join(lines, "\n")}
  end

  @spec find_edit_distance([binary], binary, integer) :: edit_result
  defp find_edit_distance(original, previous, len) do
    case max_index(original, previous, len) do
      {i, d} -> {d, i, i + len}
      _ -> nil
    end
  end

  defp max_index(original, previous, len) do
    Stream.with_index(original)
    |> Stream.chunk_every(len)
    |> Stream.map(fn [{_, i} | _] = chunk ->
      joined = Enum.map(chunk, &elem(&1, 0)) |> Enum.join("\n")
      {i, String.jaro_distance(previous, joined)}
    end)
    |> Enum.max_by(fn {_, d} -> d end, fn -> nil end)
  end
end
