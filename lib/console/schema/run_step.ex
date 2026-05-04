defmodule Console.Schema.RunStep do
  use Console.Schema.Base
  alias Console.Schema.{StackRun, RunLog}

  defenum Status, pending: 0, running: 1, successful: 2, failed: 3
  defenum Stage,  plan: 0, verify: 1, apply: 2, init: 3, destroy: 4

  schema "run_steps" do
    field :name,             :string
    field :status,           Status
    field :stage,            Stage
    field :cmd,              :string
    field :args,             {:array, :string}
    field :index,            :integer
    field :require_approval, :boolean

    has_many :logs, RunLog, foreign_key: :step_id

    belongs_to :run, StackRun

    timestamps()
  end

  def for_run(query \\ __MODULE__, run_id) do
    from(s in query, where: s.run_id == ^run_id)
  end

  def failing(query \\ __MODULE__) do
    from(s in query, where: s.status == ^:failed)
  end

  @valid ~w(name status stage cmd args require_approval index run_id)a

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
