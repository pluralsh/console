defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.DeleteRecord do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :table,     :string
    field :record_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/delete_record.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_delete_record"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Permanently delete a ServiceNow ticket using the #{name} connection. Prefer closing or cancelling a ticket with update_record unless deletion was explicitly requested."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :record_id])
    |> validate_required([:table, :record_id])
    |> validate_inclusion(:table, Client.tables())
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         :ok <- allowed(client),
         {:ok, sys_id} <- Client.resolve_sys_id(client, model.table, model.record_id),
         {:ok, path} <- Client.table_path(model.table, sys_id),
         {:ok, _} <- Client.delete(client, path) do
      Jason.encode(%{"table" => model.table, "sysId" => sys_id, "deleted" => true})
    end
  end

  defp allowed(%{allow_delete: true}), do: :ok
  defp allowed(_), do: {:error, "Deleting ServiceNow records is disabled for this workbench tool."}
end
