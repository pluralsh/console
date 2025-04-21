defmodule Console.Schema.ServiceComponentChild do
  use Piazza.Ecto.Schema
  alias Console.Schema.ServiceComponent

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

    timestamps()
  end

  @valid ~w(uid state parent_uid name namespace group version kind)a
  @required ~w(uid name version kind)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@required)
    |> foreign_key_constraint(:component_id)
  end
end
