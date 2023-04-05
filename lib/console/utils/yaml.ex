defmodule Console.Utils.Yaml do
  def format(m) when is_map(m) do
    with {:ok, doc} <- Ymlr.document(m),
      do: {:ok, String.trim_leading(doc, "---\n")}
  end
end
