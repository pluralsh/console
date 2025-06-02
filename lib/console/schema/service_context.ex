defmodule Console.Schema.ServiceContext do
  use Piazza.Ecto.Schema
  alias Console.Schema.Project

  schema "service_contexts" do
    field :name,          :string
    field :configuration, :map

    embeds_many :secrets, Secret, on_replace: :delete do
      field :name,  :string
      field :value, Piazza.Ecto.EncryptedString
    end

    belongs_to :project, Project

    timestamps()
  end

  def for_names(query \\ __MODULE__, names) do
    from(c in query, where: c.name in ^names)
  end

  @valid ~w(name configuration project_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:secrets, with: &secret_changeset/2)
    |> foreign_key_constraint(:project_id)
    |> validate_required([:name])
  end

  defp secret_changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :value])
    |> validate_required([:name, :value])
  end
end
