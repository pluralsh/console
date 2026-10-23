defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.GetRecord do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,          :map, virtual: true
    field :table,         :string
    field :record_id,     :string
    field :fields,        {:array, :string}
    field :display_value, :string, default: "true"
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/get_record.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_get_record"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Get a ServiceNow ticket by sys_id or number (for example INC0010001) using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :record_id, :fields, :display_value])
    |> validate_required([:table, :record_id])
    |> validate_inclusion(:table, Client.tables())
    |> validate_inclusion(:display_value, ~w(true false all))
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, model.table, model.record_id),
         {:ok, path} <- Client.table_path(model.table, sys_id),
         {:ok, record} <- Client.get(client, path, query(model)) do
      Jason.encode(record)
    end
  end

  defp query(model) do
    %{sysparm_display_value: model.display_value, sysparm_exclude_reference_link: true}
    |> maybe_put(:sysparm_fields, model.fields)
  end

  defp maybe_put(query, key, [_ | _] = values), do: Map.put(query, key, Enum.join(values, ","))
  defp maybe_put(query, _, _), do: query
end
