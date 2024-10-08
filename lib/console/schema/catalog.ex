defmodule Console.Schema.Catalog do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Project, PolicyBinding, Tag}

  schema "catalogs" do
    field :name,        :string
    field :description, :string
    field :category,    :string
    field :author,      :string

    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id

    belongs_to :project, Project

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    has_many :tags, Tag

    timestamps()
  end

  def for_project(query \\ __MODULE__, pid) do
    from(c in query, where: c.project_id == ^pid)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(c in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name author description category project_id)a)
    |> cast_assoc(:tags)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> foreign_key_constraint(:project_id)
    |> validate_required([:name, :author, :project_id])
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
  end
end
