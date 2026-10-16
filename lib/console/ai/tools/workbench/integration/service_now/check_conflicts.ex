defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.CheckConflicts do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :record_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/check_conflicts.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_check_conflicts"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Start a conflict check on a ServiceNow change request using the #{name} connection. The check runs in ServiceNow, read the outcome with get_change_conflicts."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:record_id])
    |> validate_required([:record_id])
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, "change_request", model.record_id),
         {:ok, started} <- Client.change_post(client, "/change/#{Client.segment(sys_id)}/conflict") do
      Jason.encode(started)
    end
  end
end
