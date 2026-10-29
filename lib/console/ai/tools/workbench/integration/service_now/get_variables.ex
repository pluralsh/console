defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.GetVariables do
  @moduledoc """
  Reads the catalog variables of a requested item (`sc_req_item`), the form values entered
  when the item was ordered. They are not columns of the item but rows of `sc_item_option`,
  linked to it through `sc_item_option_mtom`, so they are read with one dot-walked query.
  A catalog task (`sc_task`) returns the variables of its requested item.
  """

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  @tables ~w(sc_req_item sc_task)
  @limit 200

  @name "sc_item_option.item_option_new.name"
  @question "sc_item_option.item_option_new.question_text"
  @type_field "sc_item_option.item_option_new.type"
  @read_roles "sc_item_option.item_option_new.read_roles"
  @value "sc_item_option.value"

  # variable types that only lay out the form (label, break, macros, containers, split,
  # rich text label) and never hold a value
  @layout ~w(11 12 14 15 17 19 20 24 32)
  # masked variables hold secrets such as passwords
  @masked "25"

  embedded_schema do
    field :tool,      :map, virtual: true
    field :table,     :string, default: "sc_req_item"
    field :record_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/get_variables.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_get_variables"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Get the catalog variables of a ServiceNow requested item (RITM) using the #{name} connection: the form values entered when the item was ordered, for example the parameters of something to provision. Pass the RITM number or sys_id, or a catalog task (SCTASK) to get the variables of its requested item. For a request (REQ), list its requested items first with list_records on sc_req_item and query request.number=<REQ number>. Reference variables return the sys_id of the referenced record, masked (\"(masked)\") and role-restricted (\"(restricted)\") values are hidden, and \"(hidden)\" means the integration user cannot read the variable definitions. At most #{@limit} variables are read, truncated is true when there may be more."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :record_id])
    |> validate_required([:table, :record_id])
    |> validate_inclusion(:table, @tables,
      message: "must be sc_req_item or sc_task, a request (sc_request) has no variables, list its requested items with list_records first"
    )
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, model.table, model.record_id),
         {:ok, item_id} <- request_item(client, model.table, sys_id),
         {:ok, rows, truncated} <- variables(client, item_id) do
      Jason.encode(%{
        "table" => model.table,
        "sysId" => sys_id,
        "requestItem" => item_id,
        "variables" => rows,
        "truncated" => truncated
      })
    end
  end

  # The variables are filtered by item id only, so a raw sys_id is checked against sc_req_item
  # first, as list_comments does, which also tells an unknown item from one without variables.
  defp request_item(client, "sc_req_item", sys_id) do
    with {:ok, path} <- Client.table_path("sc_req_item", sys_id),
         {:ok, %{"result" => %{"sys_id" => _}}} <- Client.get(client, path, %{sysparm_fields: "sys_id"}) do
      {:ok, sys_id}
    else
      {:ok, _} -> {:error, "ServiceNow sc_req_item record #{sys_id} was not found."}
      error -> error
    end
  end

  defp request_item(client, "sc_task", sys_id) do
    with {:ok, path} <- Client.table_path("sc_task", sys_id),
         {:ok, %{"result" => %{} = task}} <-
           Client.get(client, path, %{sysparm_fields: "request_item", sysparm_exclude_reference_link: true}) do
      # the item id goes into an encoded query, so it is checked like one given by the agent
      case reference(task["request_item"]) do
        id when nonempty_string(id) -> Client.resolve_sys_id(client, "sc_req_item", id)
        _ -> {:error, "ServiceNow catalog task #{sys_id} is not attached to a requested item."}
      end
    else
      {:ok, _} -> {:error, "ServiceNow sc_task record #{sys_id} was not found."}
      error -> error
    end
  end

  defp variables(client, item_id) do
    query = %{
      sysparm_query: "request_item=#{item_id}^ORDERBYsc_item_option.order",
      sysparm_fields: Enum.join([@name, @question, @type_field, @read_roles, @value], ","),
      sysparm_limit: @limit
    }

    case Client.get(client, "/table/sc_item_option_mtom", query) do
      # layout rows are dropped after the limit, so a full page means variables may be missing
      {:ok, %{"result" => rows}} when is_list(rows) ->
        {:ok, rows |> Enum.reject(&(&1[@type_field] in @layout)) |> Enum.map(&variable/1), length(rows) >= @limit}
      {:ok, _} -> {:error, "ServiceNow returned an unexpected response for the variables of #{item_id}."}
      error -> error
    end
  end

  defp variable(row) do
    %{"name" => row[@name], "question" => row[@question], "value" => value(row)}
  end

  # Fails closed: a value is only returned when its read roles and type could be read, the variable
  # has no read roles and is not masked. Unrestricted variables come back with read_roles "", a
  # missing key means it could not be read. Variables limited to some roles in the catalog stay
  # hidden, the Table API does not check those.
  defp value(%{@read_roles => ""} = row), do: unrestricted(row)
  defp value(%{@read_roles => roles}) when nonempty_string(roles), do: "(restricted)"
  defp value(_), do: "(hidden)"

  defp unrestricted(%{@type_field => @masked}), do: "(masked)"
  defp unrestricted(%{@type_field => type} = row) when nonempty_string(type), do: row[@value]
  defp unrestricted(_), do: "(hidden)"

  defp reference(%{"value" => id}), do: id
  defp reference(id), do: id
end
