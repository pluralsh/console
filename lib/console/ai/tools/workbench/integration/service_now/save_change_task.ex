defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.SaveChangeTask do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  @sys_id ~r/\A[0-9a-f]{32}\z/i

  embedded_schema do
    field :tool,              :map, virtual: true
    field :record_id,         :string
    field :task_id,           :string
    field :short_description, :string
    field :description,       :string
    field :fields,            :map, default: %{}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/save_change_task.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_save_change_task"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Create or update a task on a ServiceNow change request using the #{name} connection. Omit task_id to create a task."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:record_id, :task_id, :short_description, :description, :fields])
    |> validate_required([:record_id])
    |> validate_format(:task_id, @sys_id, message: "must be a 32 character sys_id")
    |> validate_task()
  end

  def implement(%__MODULE__{task_id: task_id} = model) when nonempty_string(task_id) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, "change_request", model.record_id),
         {:ok, task} <-
           Client.change_patch(client, "/change/#{Client.segment(sys_id)}/task/#{Client.segment(task_id)}", body(model)) do
      Jason.encode(task)
    end
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, "change_request", model.record_id),
         {:ok, task} <- Client.change_post(client, "/change/#{Client.segment(sys_id)}/task", body(model)) do
      Jason.encode(task)
    end
  end

  defp validate_task(changeset) do
    id = get_field(changeset, :task_id)
    summary = get_field(changeset, :short_description)
    description = get_field(changeset, :description)
    fields = get_field(changeset, :fields) || %{}

    cond do
      not nonempty_string(id) and not nonempty_string(summary) ->
        add_error(changeset, :short_description, "is required to create a task")
      nonempty_string(id) and not nonempty_string(summary) and not nonempty_string(description) and map_size(fields) == 0 ->
        add_error(changeset, :fields, "must set at least one field to update a task")
      true -> changeset
    end
  end

  defp body(model) do
    (model.fields || %{})
    |> Map.new()
    |> maybe_put("short_description", model.short_description)
    |> maybe_put("description", model.description)
  end

  defp maybe_put(body, key, value) when nonempty_string(value), do: Map.put(body, key, value)
  defp maybe_put(body, _, _), do: body
end
