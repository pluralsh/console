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

defmodule Console.Schema.Configuration do
  use Piazza.Ecto.Schema

  defenum Type,
    string: 0,
    int: 1,
    bool: 2,
    domain: 3,
    bucket: 4,
    file: 5,
    function: 6,
    password: 7

  defmodule Condition do
    use Piazza.Ecto.Schema

    defenum Operation, not: 0, gt: 1, lt: 2, eq: 3, gte: 4, lte: 5, prefix: 6, suffix: 7

    embedded_schema do
      field :field,     :string
      field :value,     :string
      field :operation, Operation
    end

    @valid ~w(field value operation)a

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, @valid)
      |> validate_required([:field, :operation])
    end
  end

  embedded_schema do
    field :type,          Type
    field :name,          :string
    field :default,       :string
    field :documentation, :string
    field :longform,      :string
    field :placeholder,   :string
    field :optional,      :boolean

    embeds_one :condition, Condition
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(type name default documentation longform placeholder optional)a)
    |> cast_embed(:condition)
    |> validate_required([:type, :name])
  end
end
