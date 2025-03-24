defmodule Console.AI.Provider.Base do
  def tools(opts) do
    plural = Keyword.get(opts, :plural)
    tools  = Keyword.get(opts, :tools)
    Enum.concat(tools || [], plural || [])
  end
end
