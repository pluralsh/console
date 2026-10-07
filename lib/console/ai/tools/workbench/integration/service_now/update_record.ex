defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.UpdateRecord do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :table,     :string
    field :record_id, :string
    field :fields,    :map
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/update_record.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_update_record"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Update fields on a ServiceNow ticket using the #{name} connection, for example state, assignment, priority or resolution details."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :record_id, :fields])
    |> validate_required([:table, :record_id, :fields])
    |> validate_inclusion(:table, Client.tables())
    |> validate_change(:fields, fn :fields, fields ->
      if map_size(fields) > 0, do: [], else: [fields: "must set at least one field"]
    end)
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, model.table, model.record_id),
         {:ok, path} <- Client.table_path(model.table, sys_id),
         {:ok, record} <-
           Client.patch(client, path, model.fields, %{sysparm_exclude_reference_link: true}) do
      Jason.encode(record)
    end
  end
end
