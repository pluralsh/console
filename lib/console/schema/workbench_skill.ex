defmodule Console.Schema.WorkbenchSkill do
  use Console.Schema.Base
  alias Console.Schema.Workbench

  defenum Subagent, coding: 0, infrastructure: 1, observability: 2, integration: 3, orchestrator: 4

  schema "workbench_skills" do
    field :name, :string
    field :description, :string
    field :contents, :binary
    field :subagents, {:array, Subagent}

    belongs_to :workbench, Workbench

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(s in query, order_by: ^order)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(s in query, where: s.workbench_id == ^workbench_id)
  end

  @valid ~w(name description contents workbench_id subagents)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint([:workbench_id, :name])
    |> validate_required([:name, :contents])
  end
end
