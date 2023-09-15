defmodule Console.Schema.ServiceConfiguration do
  use Piazza.Ecto.Schema
  alias Console.Schema.Revision

  schema "service_configuration" do
    field :name,  :string
    field :value, Piazza.Ecto.EncryptedString

    belongs_to :revision, Revision

    timestamps()
  end

  def for_revision(query \\ __MODULE__, revision_id) do
    from(sc in query, where: sc.revision_id == ^revision_id)
  end

  @valid ~w(name value revision_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(name value)a)
  end
end
