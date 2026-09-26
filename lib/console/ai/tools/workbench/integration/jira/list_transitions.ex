defmodule Console.AI.Tools.Workbench.Integration.Jira.ListTransitions do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Jira.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,          :map, virtual: true
    field :issue_id,      :string
    field :transition_id, :string
    field :expand,        {:array, :string}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/jira/list_transitions.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "jira_#{name}_list_transitions"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "List the available transitions for a Jira issue using the #{name} connection."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:issue_id, :transition_id, :expand])
    |> validate_required([:issue_id])
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, transitions} <-
           Client.get(
             client,
             "/issue/#{Client.segment(model.issue_id)}/transitions",
             query(model)
           ) do
      Jason.encode(transitions)
    end
  end

  defp query(model) do
    %{}
    |> maybe_put(:transitionId, model.transition_id)
    |> maybe_put(:expand, model.expand)
  end

  defp maybe_put(query, key, value) when nonempty_string(value), do: Map.put(query, key, value)
  defp maybe_put(query, key, [_ | _] = values), do: Map.put(query, key, Enum.join(values, ","))
  defp maybe_put(query, _, _), do: query
end
