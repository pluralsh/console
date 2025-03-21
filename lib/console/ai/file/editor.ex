defmodule Console.AI.File.Editor do
  @moduledoc """
  A slightly more clever way of modifying a file from the result of LLM tool calls (which are imprecise).  This does:

  * a direct file write if the file doesn't exist at all
  * a byte-by-byte replace if possible
  * a distance-based replace if the previous fails.  This takes the original content and searches it within some
    window of lines, and uses jaro-winkler distance to find the closest block.  If nothing is "close enough" it
    fails.
  """
  alias Console.AI.File.DistanceReplacer

  @type result :: :ok | {:error, binary}

  @spec replace(binary, binary, binary) :: result
  def replace(path, previous, replacement) do
    case File.read(path) do
      {:ok, content} ->
        replace_existing(path, content, String.trim(previous, "\n"), String.trim(replacement, "\n"))
      _ -> File.write(path, replacement)
    end
  end

  defp replace_existing(path, content, "", replacement), do: File.write(path, "#{content}\n#{replacement}")
  defp replace_existing(path, content, previous, replacement) do
    {content, clines}     = prep(content)
    {replacement, rlines} = prep(replacement)
    {previous, plines}    = prep(previous)

    with {:error, _} <- perfect_replacement(content, previous, replacement),
         {:error, _} <- DistanceReplacer.replace(clines, plines, previous, rlines) do
      {:error, "Could not find a safe replacement for #{Path.basename(path)} within block #{previous}"}
    else
      {:ok, new} -> File.write(path, String.trim_leading(new))
    end
  end

  defp perfect_replacement(content, "\n" <> trimmed = previous, replacement) do
    with {:error, _} <- do_replace(content, previous, replacement),
      do: perfect_replacement(content, trimmed, replacement)
  end
  defp perfect_replacement(content, previous, replacement), do: do_replace(content, previous, replacement)

  defp do_replace(content, previous, replacement) do
    case String.replace(content, previous, replacement, global: false) do
      ^content -> {:error, "no replacement found"}
      new -> {:ok, new}
    end
  end

  defp prep(content) do
    content = pad(content)
    {content, Console.lines(content)}
  end

  defp pad(content) do
    case String.ends_with?(content, "\n") do
      true -> content
      false -> content <> "\n"
    end
  end
end
