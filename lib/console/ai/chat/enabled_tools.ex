defmodule Console.AI.Chat.EnabledTools do
  defstruct [:enabled, tool_names: [], tools: []]

  def new(tools, enabled \\ []) do
    names = Enum.map(tools, &Console.AI.Tool.name/1)
    %__MODULE__{enabled: MapSet.new(enabled, &Console.AI.Tool.name/1), tool_names: names, tools: tools}
  end

  def enabled(%__MODULE__{enabled: enabled}), do: MapSet.to_list(enabled)

  def enable(%__MODULE__{enabled: enabled} = s, tools) when is_list(tools) do
    %{s | enabled: MapSet.union(enabled, MapSet.new(tools))}
  end

  def tools(%__MODULE__{tools: tools, enabled: enabled}) do
    Enum.filter(tools, &MapSet.member?(enabled, Console.AI.Tool.name(&1)))
  end

  def search(%__MODULE__{tools: tools}, query, max_results \\ 5) do
    with {:ok, regex} <- Regex.compile(query) do
      tools
      |> Enum.filter(&Regex.match?(regex, Console.AI.Tool.name(&1)))
      |> Enum.take(max_results)
      |> Enum.map(& %{
        name: Console.AI.Tool.name(&1),
        description: Console.AI.Tool.description(&1),
        # json_schema: Console.AI.Tool.json_schema(&1)
      })
      |> then(& {:ok, &1})
    end
  end

  def tool_names(%__MODULE__{tool_names: tool_names}), do: tool_names
end
