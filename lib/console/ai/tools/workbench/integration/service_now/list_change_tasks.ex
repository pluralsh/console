defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ListChangeTasks do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :record_id, :string
    field :query,     :string
    field :cursor,    :string
    field :limit,     :integer, default: 50
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/list_change_tasks.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_list_change_tasks"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "List the tasks of a ServiceNow change request using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:record_id, :query, :cursor, :limit])
    |> validate_required([:record_id])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, offset} <- Client.parse_cursor(model.cursor),
         {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, "change_request", model.record_id),
         {:ok, response} <-
           Client.change_get(client, "/change/#{Client.segment(sys_id)}/task", query(model, offset)) do
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
