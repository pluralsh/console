defmodule Console.AI.Tools.Workbench.Integration.Jira.SaveIssue do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Jira.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,        :map, virtual: true
    field :issue_id,    :string
    field :project,     :string
    field :issue_type,  :string
    field :summary,     :string
    field :description, :string
    field :fields,      :map, default: %{}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/jira/save_issue.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "jira_#{name}_save_issue"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Create or update a Jira issue using the #{name} connection. Omit issue_id to create an issue."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:issue_id, :project, :issue_type, :summary, :description, :fields])
    |> validate_create_fields()
  end

  def implement(%__MODULE__{issue_id: issue_id} = model) when nonempty_string(issue_id) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, response} <-
           Client.put(client, "/issue/#{Client.segment(issue_id)}", %{"fields" => fields(model)}) do
      Jason.encode(Map.merge(%{"issueId" => issue_id, "updated" => true}, response))
    end
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, response} <- Client.post(client, "/issue", %{"fields" => fields(model)}) do
      Jason.encode(response)
    end
  end

  defp validate_create_fields(changeset) do
    case get_field(changeset, :issue_id) do
      issue_id when nonempty_string(issue_id) -> changeset
      _ -> validate_required(changeset, [:project, :issue_type, :summary])
    end
  end

  defp fields(model) do
    model.fields
    |> Map.new()
    |> maybe_put("project", model.project, &%{"key" => &1})
    |> maybe_put("issuetype", model.issue_type, &%{"name" => &1})
    |> maybe_put("summary", model.summary)
    |> maybe_put("description", model.description)
  end

  defp maybe_put(fields, key, value, mapper \\ & &1)
  defp maybe_put(fields, key, value, mapper) when nonempty_string(value),
    do: Map.put(fields, key, mapper.(value))

  defp maybe_put(fields, _, _, _), do: fields
end
