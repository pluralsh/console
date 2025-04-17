defmodule Console.AI.MCP.Tool do
  defstruct [:name, :description, :input_schema]

  def new(args) do
    %__MODULE__{
      name: args["name"],
      description: args["description"],
      input_schema: args["inputSchema"]
    }
  end
end
