defmodule Console.AI.Tools.Workbench.Integration.Jira.GetIssue do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Jira.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,        :map, virtual: true
    field :issue_id,    :string
    field :fields,      {:array, :string}
    field :expand,      {:array, :string}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/jira/get_issue.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "jira_#{name}_get_issue"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Get a Jira issue by key or ID using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:issue_id, :fields, :expand])
    |> validate_required([:issue_id])
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, issue} <-
           Client.get(client, "/issue/#{Client.segment(model.issue_id)}", query(model)) do
      Jason.encode(issue)
    end
  end

  defp query(model) do
    %{}
    |> maybe_put(:fields, model.fields)
    |> maybe_put(:expand, model.expand)
  end

  defp maybe_put(query, key, [_ | _] = values), do: Map.put(query, key, Enum.join(values, ","))
  defp maybe_put(query, _, _), do: query
end
