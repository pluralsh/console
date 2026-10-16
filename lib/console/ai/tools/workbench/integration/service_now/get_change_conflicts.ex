defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.GetChangeConflicts do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :record_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/get_change_conflicts.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_get_change_conflicts"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Get the status and results of the latest conflict check on a ServiceNow change request using the #{name} connection. Start a check with check_conflicts first."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:record_id])
    |> validate_required([:record_id])
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, "change_request", model.record_id),
         {:ok, conflicts} <- Client.change_get(client, "/change/#{Client.segment(sys_id)}/conflict") do
      Jason.encode(conflicts)
    end
  end
end
