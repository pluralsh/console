defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.GetChange do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :record_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/get_change.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_get_change"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Get a ServiceNow change request with all of its change management fields (type, model, state, risk, plans, approval) by sys_id or number using the #{name} connection. Every field is returned as a display value and a raw value."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:record_id])
    |> validate_required([:record_id])
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, "change_request", model.record_id),
         {:ok, change} <- Client.change_get(client, "/change/#{Client.segment(sys_id)}") do
      Jason.encode(change)
    end
  end
end
