defmodule Console.AI.Tools.Workbench.MCP do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.AI.Workbench.MCP
  alias Console.AI.MCP.Tool

  embedded_schema do
    field :tool,        :map, virtual: true
    field :mcp_tool,    :map, virtual: true
    field :job,         :map, virtual: true
    field :input,       :map
  end

  def name(%__MODULE__{tool: %WorkbenchTool{tool: :mcp, name: name}, mcp_tool: %Tool{name: tname}}), do: "mcp_#{name}_#{tname}"
  def name(%__MODULE__{tool: %WorkbenchTool{tool: tool, name: name}, mcp_tool: %Tool{name: tname}}), do: "#{tool}_#{name}_#{tname}"

  def description(%__MODULE__{mcp_tool: %Tool{description: description}}), do: description

  def json_schema(%__MODULE__{mcp_tool: %Tool{input_schema: input_schema}}), do: input_schema

  def changeset(%__MODULE__{} = model, input) do
    model
    |> cast(%{input: input}, [:input])
    |> validate_required([:input])
  end

  def implement(_, %__MODULE__{tool: t, mcp_tool: %Tool{name: name}, job: j, input: input}),
    do: MCP.invoke(t, j, name, input)
end
