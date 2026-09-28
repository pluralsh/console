defmodule Console.AI.Tools.Workbench.Integration.Jira.TransitionIssue do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Jira.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,          :map, virtual: true
    field :issue_id,      :string
    field :transition_id, :string
    field :fields,        :map, default: %{}
    field :update,        :map, default: %{}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/jira/transition_issue.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "jira_#{name}_transition_issue"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Transition a Jira issue using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:issue_id, :transition_id, :fields, :update])
    |> validate_required([:issue_id, :transition_id])
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, response} <-
           Client.post(
             client,
             "/issue/#{Client.segment(model.issue_id)}/transitions",
             body(model)
           ) do
      Jason.encode(
        Map.merge(
          %{"issueId" => model.issue_id, "transitionId" => model.transition_id, "transitioned" => true},
          response
        )
      )
    end
  end

  defp body(model) do
    %{"transition" => %{"id" => model.transition_id}}
    |> maybe_put("fields", model.fields)
    |> maybe_put("update", model.update)
  end

  defp maybe_put(body, key, value) when is_map(value) and map_size(value) > 0,
    do: Map.put(body, key, value)

  defp maybe_put(body, _, _), do: body
end
