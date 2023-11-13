defmodule Console.Schema.DiffNormalizer do
  use Piazza.Ecto.Schema

  embedded_schema do
    field :group,        :string
    field :kind,         :string
    field :name,         :string
    field :namespace,    :string
    field :json_patches, {:array, :string}
  end

  @valid ~w(json_patches group kind name namespace)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
  end
end

defmodule Console.Schema.Metadata do
  use Piazza.Ecto.Schema

  embedded_schema do
    field :labels,      :map
    field :annotations, :map
  end

  @valid ~w(labels annotations)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
  end
end
