defmodule Console.Schema.RunStep do
  use Piazza.Ecto.Schema
  alias Console.Schema.{StackRun, RunLog}

  defenum Status, pending: 0, running: 1, successful: 2, failed: 3
  defenum Stage,  plan: 0, verify: 1, apply: 2

  schema "run_steps" do
    field :name,   :string
    field :status, Status
    field :stage,  Stage
    field :cmd,    :string
    field :args,   {:array, :string}
    field :index,  :integer

    has_many :logs, RunLog, foreign_key: :step_id

    belongs_to :run, StackRun

    timestamps()
  end

  @valid ~w(name status stage cmd args index run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:run_id)
    |> validate_required(~w(name status stage cmd args index)a)
  end

  def update_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(status)a)
    |> validate_required(~w(status)a)
  end
end
