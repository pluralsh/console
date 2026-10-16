defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.CreateRecord do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,              :map, virtual: true
    field :table,             :string
    field :short_description, :string
    field :description,       :string
    field :fields,            :map, default: %{}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/create_record.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_create_record"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Create a ServiceNow ticket (incident, change request, problem or catalog task) using the #{name} connection. For change requests prefer create_change, which sets the type and model and takes the change plans."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :short_description, :description, :fields])
    |> validate_required([:table, :short_description])
    |> validate_inclusion(:table, Client.tables())
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, path} <- Client.table_path(model.table),
         {:ok, record} <-
           Client.post(client, path, body(model), %{sysparm_exclude_reference_link: true}) do
      Jason.encode(record)
    end
  end

  defp body(model) do
    model.fields
    |> Map.new()
    |> Map.put("short_description", model.short_description)
    |> maybe_put("description", model.description)
  end

  defp maybe_put(body, key, value) when nonempty_string(value), do: Map.put(body, key, value)
  defp maybe_put(body, _, _), do: body
end
