defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ListComments do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  @journal_fields ~w(sys_id element value sys_created_on sys_created_by)

  embedded_schema do
    field :tool,      :map, virtual: true
    field :table,     :string
    field :record_id, :string
    field :cursor,    :string
    field :limit,     :integer, default: 50
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/list_comments.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_list_comments"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List additional comments and work notes on a ServiceNow ticket, newest first, using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :record_id, :cursor, :limit])
    |> validate_required([:table, :record_id])
    |> validate_inclusion(:table, Client.tables())
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, offset} <- Client.parse_cursor(model.cursor),
         {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, model.table, model.record_id),
         {:ok, response} <-
           Client.get(client, "/table/sys_journal_field", %{
             sysparm_query:
               "element_id=#{sys_id}^elementINcomments,work_notes^ORDERBYDESCsys_created_on",
             sysparm_fields: Enum.join(@journal_fields, ","),
             sysparm_limit: model.limit,
             sysparm_offset: offset
           }) do
      response
      |> Client.put_next_cursor(offset, model.limit)
      |> Jason.encode()
    end
  end
end
