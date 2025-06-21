defmodule Console.Schema.ServiceComponentChild do
  use Piazza.Ecto.Schema
  alias Console.Schema.{ServiceComponent, AiInsight}

  schema "service_component_children" do
    field :uid,        :string
    field :state,      ServiceComponent.State
    field :parent_uid, :string
    field :name,       :string
    field :namespace,  :string
    field :group,      :string
    field :version,    :string
    field :kind,       :string

    belongs_to :component, ServiceComponent
    belongs_to :insight,   AiInsight, on_replace: :update

    timestamps()
  end

  def for_component(query \\ __MODULE__, component_id) do
    from(c in query, where: c.component_id == ^component_id)
  end

  def for_parent(query \\ __MODULE__, uid) do
    from(c in query, where: c.parent_uid == ^uid)
  end

  def for_state(query \\ __MODULE__, state) do
    from(c in query, where: c.state == ^state)
  end

  def for_states(query \\ __MODULE__, states) do
    from(c in query, where: c.state in ^states)
  end

  @valid ~w(uid state parent_uid name namespace group version kind)a
  @required ~w(uid name version kind)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:insight)
    |> validate_required(@required)
    |> foreign_key_constraint(:component_id)
  end
end
