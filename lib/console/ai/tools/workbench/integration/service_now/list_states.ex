defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ListStates do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :table,     :string
    field :record_id, :string
    field :field,     :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/list_states.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_list_states"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List the states a ServiceNow ticket can be in using the #{name} connection. For a change request with record_id it returns the states the change can move to next, with their conditions. Pass field to list the choices of another choice field instead, for example close_code to find the valid resolution codes before resolving an incident. Use it before transition_record."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :record_id, :field])
    |> validate_required([:table])
    |> validate_inclusion(:table, Client.tables())
  end

  def implement(%__MODULE__{table: "change_request", record_id: id, field: field} = model)
      when nonempty_string(id) and field in [nil, "state"] do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, model.table, id),
         {:ok, next} <- Client.change_get(client, "/change/#{Client.segment(sys_id)}/nextstates") do
      Jason.encode(%{"table" => model.table, "sysId" => sys_id, "nextStates" => next["result"] || next})
    end
  end

  def implement(%__MODULE__{field: field} = model) when nonempty_string(field) and field != "state" do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, choices} <- Client.field_choices(client, model.table, field) do
      Jason.encode(%{"table" => model.table, "field" => field, "choices" => choices})
    end
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, choices} <- Client.state_choices(client, model.table) do
      Jason.encode(%{"table" => model.table, "states" => choices})
    end
  end
end
