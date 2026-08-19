defmodule Console.AI.Tools.Workbench.Output do
  @max_bytes 50 * 1024
  @default_hint "narrow the query or lower the limit to retrieve the remaining data"

  def max_bytes, do: @max_bytes

  def truncate(content, hint \\ @default_hint, max_bytes \\ @max_bytes) when is_binary(content) do
    suffix = "\n\n...[output truncated at #{format_bytes(max_bytes)}; #{hint}]"
    Console.truncate(content, max_bytes, suffix)
  end

  def json(value, hint \\ @default_hint, max_bytes \\ @max_bytes) do
    with {:ok, content} <- Jason.encode(value), do: {:ok, truncate(content, hint, max_bytes)}
  end

  defp format_bytes(51_200), do: "50 KiB"
  defp format_bytes(bytes), do: "#{bytes} bytes"
end
