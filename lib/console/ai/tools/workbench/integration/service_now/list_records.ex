defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ListRecords do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,          :map, virtual: true
    field :table,         :string
    field :query,         :string
    field :fields,        {:array, :string}
    field :display_value, :string, default: "true"
    field :cursor,        :string
    field :limit,         :integer, default: 20
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/list_records.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_list_records"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Search ServiceNow tickets (incidents, change requests, problems, requests, requested items, catalog tasks) with an encoded query using the #{name} connection. Follow the catalog hierarchy with dot-walked queries: the requested items of a request are table sc_req_item with query request.number=REQ0010001, the catalog tasks of a requested item are table sc_task with query request_item.number=RITM0010001."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :query, :fields, :display_value, :cursor, :limit])
    |> validate_required([:table])
    |> validate_inclusion(:table, Client.tables())
    |> validate_inclusion(:display_value, ~w(true false all))
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, offset} <- Client.parse_cursor(model.cursor),
         {:ok, client} <- Client.build(model.tool),
         {:ok, path} <- Client.table_path(model.table),
         {:ok, response} <- Client.get(client, path, query(model, offset)) do
      response
      |> Client.put_next_cursor(offset, model.limit)
      |> Jason.encode()
    end
  end

  defp query(model, offset) do
    %{
      sysparm_limit: model.limit,
      sysparm_offset: offset,
      sysparm_display_value: model.display_value,
      sysparm_exclude_reference_link: true
    }
    |> maybe_put(:sysparm_query, model.query)
    |> maybe_put(:sysparm_fields, model.fields)
  end

  defp maybe_put(query, key, value) when nonempty_string(value), do: Map.put(query, key, value)
  defp maybe_put(query, key, [_ | _] = values), do: Map.put(query, key, Enum.join(values, ","))
  defp maybe_put(query, _, _), do: query
end
