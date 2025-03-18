defmodule Console.AI.MCP.State do
  defstruct [:servers, :thread, :last_used, tools: %{}, clients: %{}]

  def touch(%__MODULE__{} = s), do: %{s | last_used: Timex.now()}
end
