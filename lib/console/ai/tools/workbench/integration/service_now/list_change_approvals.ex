defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ListChangeApprovals do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  @fields ~w(sys_id approver state comments sys_created_on sys_updated_on)

  embedded_schema do
    field :tool,      :map, virtual: true
    field :record_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/list_change_approvals.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_list_change_approvals"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List the approvals on a ServiceNow change request, with approver, state and comments, using the #{name} connection. Approvals can only be decided in ServiceNow."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:record_id])
    |> validate_required([:record_id])
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, "change_request", model.record_id),
         {:ok, approvals} <-
           Client.get(client, "/table/sysapproval_approver", %{
             sysparm_query: "sysapproval=#{sys_id}^ORDERBYsys_created_on",
             sysparm_fields: Enum.join(@fields, ","),
             sysparm_display_value: "true",
             sysparm_exclude_reference_link: true,
             sysparm_limit: 100
           }) do
      Jason.encode(approvals)
    end
  end
end
