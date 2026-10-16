defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ListChangeModels do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,   :map, virtual: true
    field :query,  :string
    field :cursor, :string
    field :limit,  :integer, default: 20
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/list_change_models.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_list_change_models"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List the change models available in ServiceNow using the #{name} connection. A model defines the states and approvals a change goes through, pass its name or sys_id to create_change."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:query, :cursor, :limit])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, offset} <- Client.parse_cursor(model.cursor),
         {:ok, client} <- Client.build(model.tool),
         {:ok, response} <- Client.change_get(client, "/change/model", query(model, offset)) do
      response
      |> Client.put_next_cursor(offset, model.limit)
      |> Jason.encode()
    end
  end

  defp query(model, offset) do
    %{sysparm_limit: model.limit, sysparm_offset: offset}
    |> maybe_put(:sysparm_query, model.query)
  end

  defp maybe_put(query, key, value) when nonempty_string(value), do: Map.put(query, key, value)
  defp maybe_put(query, _, _), do: query
end
