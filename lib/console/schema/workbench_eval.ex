defmodule Console.Schema.WorkbenchEval do
  use Console.Schema.Base
  alias Console.Schema.{Workbench, WorkbenchEvalResult}

  schema "workbench_evals" do
    field :conclusion_rules, :binary
    field :prompt_rules,     :binary
    field :progress_rules,   :binary

    belongs_to :workbench, Workbench

    has_many :results, WorkbenchEvalResult, on_replace: :delete

    timestamps()
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(e in query, where: e.workbench_id == ^workbench_id)
  end

  @valid ~w(workbench_id conclusion_rules prompt_rules progress_rules)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint(:workbench_id)
    |> validate_required([:workbench_id])
  end
end
