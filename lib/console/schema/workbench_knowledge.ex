defmodule Console.Schema.WorkbenchKnowledge do
  use Console.Schema.Base
  alias Console.Schema.Workbench

  schema "workbench_knowledge" do
    field :name,         :string
    field :description,  :string
    field :knowledge,    :binary
    field :labels,       {:array, :string}
    field :usages,       :integer, default: 0
    field :last_used_at, :utc_datetime

    belongs_to :workbench, Workbench

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(k in query, order_by: ^order)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(k in query, where: k.workbench_id == ^workbench_id)
  end

  @valid ~w(name description knowledge labels usages last_used_at workbench_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint([:workbench_id, :name])
    |> validate_required([:name, :knowledge])
  end
end
