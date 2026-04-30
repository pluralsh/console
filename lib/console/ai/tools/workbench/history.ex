defmodule Console.AI.Tools.Workbench.History do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.{Provider, Chat.Engine, Workbench.Eval}

  require EEx

  embedded_schema do
    field :activities, :map, virtual: true
    field :job,        :map, virtual: true

    field :query, :string
  end

  @json_schema Console.priv_file!("tools/workbench/history.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_activity_history"
  def description(_), do: "Searches past workbench activities.  Useful to remember what has been done that might not be present in the context of this subagent."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:query])
    |> validate_required([:query])
  end

  def implement(%__MODULE__{job: job, activities: activities, query: query}) do
    preface = system_prompt(job: job)

    Enum.map(activities, & {:user, Eval.activity_prompt(activity: &1)})
    |> Engine.fit_context_window(preface)
    |> Enum.concat([{:user, query}])
    |> Provider.completion(preface: preface)
  end

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "history", "system.md.eex"]), [:assigns])
end
