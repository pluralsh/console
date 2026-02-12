defmodule Console.AI.Tools.Workbench.Subagent do
  use Console.AI.Tools.Workbench.Base
  import EctoEnum

  defenum Subagent, coding: 0, infrastructure: 1, observability: 2, integration: 3

  embedded_schema do
    field :subagents, {:array, Subagent}, virtual: true
    field :subagent, Subagent
    field :prompt, :string
  end

  @json_schema Console.priv_file!("tools/workbench/subagent.json") |> Jason.decode!()

  def name(_), do: "workbench_subagent"
  def json_schema(%__MODULE__{subagents: subagents}) do
    put_in(@json_schema, ["properties", "subagent"], %{"type" => "string", "enum" => subagents})
  end
  def description(%__MODULE__{}), do: "Invoke a subagent to accomplish the task."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:subagent, :prompt])
    |> validate_required([:subagent, :prompt])
  end

  def implement(_, result), do: {:ok, result}
end
