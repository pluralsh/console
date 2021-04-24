defmodule Console.Schema.Audit do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User}

  defenum Type,
    build: 0,
    pod: 1,
    configuration: 2,
    user: 3,
    group: 4,
    role: 5,
    group_member: 6

  defenum Action,
    create: 0,
    update: 1,
    delete: 2,
    approve: 3,
    cancel: 4

  schema "audits" do
    field :type, Type
    field :action, Action
    field :repository, :string
    field :data, Piazza.Ecto.Types.Erlang

    belongs_to :actor, User

    timestamps()
  end

  def for_repo(query \\ __MODULE__, repo) do
    from(a in query, where: a.repository == ^repo)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(a in query, order_by: ^order)
  end

  @valid ~w(actor_id type action repository)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:actor_id)
    |> validate_required([:type, :action, :data])
  end
end
