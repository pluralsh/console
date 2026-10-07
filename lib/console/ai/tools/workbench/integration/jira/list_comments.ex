defmodule Console.AI.Tools.Workbench.Integration.Jira.ListComments do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Jira.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,     :map, virtual: true
    field :issue_id, :string
    field :cursor,   :string
    field :limit,    :integer, default: 50
  end

  @json_schema Console.priv_file!("tools/workbench/integration/jira/list_comments.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "jira_#{name}_list_comments"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "List comments on a Jira issue using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:issue_id, :cursor, :limit])
    |> validate_required([:issue_id])
    |> validate_number(:limit, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, start_at} <- cursor(model.cursor),
         {:ok, client} <- Client.build(model.tool),
         {:ok, response} <-
           Client.get(
             client,
             "/issue/#{Client.segment(model.issue_id)}/comment",
             %{startAt: start_at, maxResults: model.limit}
           ) do
      response
      |> normalize_cursor()
      |> Jason.encode()
    end
  end

  defp cursor(value) when nonempty_string(value) do
    case Integer.parse(value) do
      {offset, ""} when offset >= 0 -> {:ok, offset}
      _ -> {:error, "Jira comment cursor must be a non-negative integer offset."}
    end
  end

  defp cursor(_), do: {:ok, 0}

  defp normalize_cursor(%{} = response) do
    start_at = response["startAt"] || 0
    count = response["comments"] |> List.wrap() |> length()
    total = response["total"] || count
    next_cursor = if start_at + count < total, do: Integer.to_string(start_at + count)

    Map.put(response, "nextCursor", next_cursor)
  end
end
