defmodule Console.AI.Tools.Workbench.Output do
  @max_bytes 50 * 1024
  @default_hint "narrow the query or lower the limit to retrieve the remaining data"

  def max_bytes, do: @max_bytes

  def truncate(content, hint \\ @default_hint) when is_binary(content) do
    suffix = "\n\n...[output truncated at 50 KiB; #{hint}]"
    Console.truncate(content, @max_bytes, suffix)
  end

  def json(value, hint \\ @default_hint) do
    with {:ok, content} <- Jason.encode(value), do: {:ok, truncate(content, hint)}
  end
end
