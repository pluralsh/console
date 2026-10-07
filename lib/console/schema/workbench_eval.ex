defmodule Console.Schema.WorkbenchEval do
  use Console.Schema.Base
  alias Console.Schema.{Workbench, WorkbenchEvalResult}

  defmodule Automation do
    use Console.Schema.Base

    embedded_schema do
      field :enabled,      :boolean, default: false
      field :max_score,    :integer
      field :max_skills,   :integer, default: 50
      field :instructions, :string
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, ~w(enabled max_score max_skills instructions)a)
      |> validate_required([:enabled, :max_skills])
      |> validate_number(:max_score, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
      |> validate_number(:max_skills, greater_than: 0)
      |> validate_max_score()
    end

    defp validate_max_score(changeset) do
      case get_field(changeset, :enabled) do
        true -> validate_required(changeset, [:max_score])
        _ -> changeset
      end
    end
  end

  schema "workbench_evals" do
    field :conclusion_rules, :binary
    field :prompt_rules,     :binary
    field :progress_rules,   :binary

    embeds_one :automation, Automation, on_replace: :delete

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
    |> cast_embed(:automation)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint(:workbench_id)
    |> validate_required([:workbench_id])
  end
end
