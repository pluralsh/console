defmodule Console.Schema.Manifest do
  use Piazza.Ecto.Schema

  defenum Provider, aws: 0, gcp: 1, azure: 2

  embedded_schema do
    field :name,     :string
    field :cluster,  :string
    field :bucket,   :string
    field :project,  :string
    field :provider, Provider
    field :region,   :string
  end

  @valid ~w(cluster bucket project provider region)a

  def build(name, attrs) do
    %__MODULE__{name: name}
    |> cast(attrs, @valid)
    |> apply_changes()
  end
end
