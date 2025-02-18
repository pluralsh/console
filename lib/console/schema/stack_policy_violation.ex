defmodule Console.Schema.StackPolicyViolation do
  use Piazza.Ecto.Schema
  alias Console.Schema.{StackRun, StackViolationCause, Vulnerability}


  schema "stack_policy_violations" do
    field :policy_id,       :string
    field :policy_url,      :string
    field :policy_module,   :string
    field :title,           :string
    field :description,     :string
    field :resolution,      :string
    field :severity,        Vulnerability.Severity

    has_many :causes, StackViolationCause, foreign_key: :violation_id, on_replace: :delete
    belongs_to :run, StackRun

    timestamps()
  end

  @valid ~w(policy_id policy_url policy_module title description resolution severity run_id)a
  @required @valid -- [:run_id]

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:causes)
    |> foreign_key_constraint(:run_id)
    |> validate_required(@required)
  end
end
