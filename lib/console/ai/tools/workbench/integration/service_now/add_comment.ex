defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.AddComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :table,     :string
    field :record_id, :string
    field :body,      :string
    field :type,      :string, default: "work_notes"
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/add_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_add_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Add a work note (internal) or an additional comment (visible to the caller) to a ServiceNow ticket using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :record_id, :body, :type])
    |> validate_required([:table, :record_id, :body])
    |> validate_inclusion(:table, Client.tables())
    |> validate_inclusion(:type, ~w(work_notes comments))
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, model.table, model.record_id),
         {:ok, path} <- Client.table_path(model.table, sys_id),
         {:ok, _} <-
           Client.patch(client, path, %{model.type => model.body}, %{sysparm_fields: "sys_id,number"}) do
      Jason.encode(%{"table" => model.table, "sysId" => sys_id, "type" => model.type, "added" => true})
    end
  end
end
