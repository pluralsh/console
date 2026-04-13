defmodule Console.Schema.WorkbenchSkill do
  use Console.Schema.Base
  alias Console.Schema.Workbench

  schema "workbench_skills" do
    field :name, :string
    field :description, :string
    field :contents, :binary

    belongs_to :workbench, Workbench

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(s in query, order_by: ^order)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(s in query, where: s.workbench_id == ^workbench_id)
  end

  @valid ~w(name description contents workbench_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint([:workbench_id, :name])
    |> validate_required([:name, :contents])
  end
end
