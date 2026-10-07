defmodule Console.AI.Tools.Workbench.Integration.Jira.ListIssues do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Jira.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,   :map, virtual: true
    field :jql,    :string
    field :fields, {:array, :string}
    field :cursor, :string
    field :limit,  :integer, default: 50
  end

  @json_schema Console.priv_file!("tools/workbench/integration/jira/list_issues.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "jira_#{name}_list_issues"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Search Jira issues with JQL using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:jql, :fields, :cursor, :limit])
    |> validate_required([:jql])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, query} <- query(client.deployment, model),
         {:ok, response} <- Client.search(client, query) do
      response
      |> normalize_cursor(client.deployment)
      |> Jason.encode()
    end
  end

  defp query(deployment, model) do
    %{jql: model.jql, maxResults: model.limit}
    |> maybe_put_fields(model.fields)
    |> maybe_put_cursor(deployment, model.cursor)
  end

  defp maybe_put_fields(query, [_ | _] = fields),
    do: Map.put(query, :fields, Enum.join(fields, ","))

  defp maybe_put_fields(query, _), do: query

  defp maybe_put_cursor(query, :cloud, cursor) when nonempty_string(cursor),
    do: {:ok, Map.put(query, :nextPageToken, cursor)}

  defp maybe_put_cursor(query, :cloud, _), do: {:ok, query}

  defp maybe_put_cursor(query, :datacenter, cursor) when nonempty_string(cursor) do
    case Integer.parse(cursor) do
      {offset, ""} when offset >= 0 -> {:ok, Map.put(query, :startAt, offset)}
      _ -> {:error, "Jira Data Center cursor must be a non-negative integer offset."}
    end
  end

  defp maybe_put_cursor(query, :datacenter, _), do: {:ok, Map.put(query, :startAt, 0)}

  defp normalize_cursor(%{} = response, :cloud) do
    Map.put(response, "nextCursor", response["nextPageToken"])
  end

  defp normalize_cursor(%{} = response, :datacenter) do
    start_at = response["startAt"] || 0
    count = response["issues"] |> List.wrap() |> length()
    total = response["total"] || count
    next_cursor = if start_at + count < total, do: Integer.to_string(start_at + count)

    Map.put(response, "nextCursor", next_cursor)
  end
end
