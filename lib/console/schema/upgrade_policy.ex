defmodule Console.Schema.UpgradePolicy do
  use Piazza.Ecto.Schema

  defenum Type, deploy: 0, approval: 1, ignore: 2

  schema "upgrade_policies" do
    field :name,         :string
    field :description,  :string
    field :target,       :string
    field :repositories, {:array, :string}
    field :type,         Type
    field :weight,       :integer

    timestamps()
  end

  @valid ~w(name description target type weight repositories)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> validate_required([:name, :target, :type])
  end
end
