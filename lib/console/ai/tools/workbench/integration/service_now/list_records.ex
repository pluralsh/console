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
      "Search ServiceNow tickets (incidents, change requests, problems, catalog tasks) with an encoded query using the #{name} connection."

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
    with {:ok, offset} <- cursor(model.cursor),
         {:ok, client} <- Client.build(model.tool),
         {:ok, path} <- Client.table_path(model.table),
         {:ok, response} <- Client.get(client, path, query(model, offset)) do
      response
      |> normalize_cursor(offset, model.limit)
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

  defp cursor(value) when nonempty_string(value) do
    case Integer.parse(value) do
      {offset, ""} when offset >= 0 -> {:ok, offset}
      _ -> {:error, "ServiceNow cursor must be a non-negative integer offset."}
    end
  end

  defp cursor(_), do: {:ok, 0}

  defp normalize_cursor(%{} = response, offset, limit) do
    count = response["result"] |> List.wrap() |> length()
    next_cursor = if count >= limit, do: Integer.to_string(offset + count)

    Map.put(response, "nextCursor", next_cursor)
  end

  defp maybe_put(query, key, value) when nonempty_string(value), do: Map.put(query, key, value)
  defp maybe_put(query, key, [_ | _] = values), do: Map.put(query, key, Enum.join(values, ","))
  defp maybe_put(query, _, _), do: query
end
