defmodule Console.Schema.Gates.JobSpec do
  use Piazza.Ecto.Schema

  embedded_schema do
    field :namespace, :string
    field :raw, :string
    embeds_many :containers, Container, on_replace: :delete do
      field       :image, :string
      field       :args,  {:array, :string}

      embeds_many :env, Env, on_replace: :delete do
        field :name,  :string
        field :value, :string
      end

      embeds_many :env_from, EnvFrom, on_replace: :delete do
        field :secret,     :string
        field :config_map, :string
      end
    end
  end

  @valid ~w(namespace raw)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:containers, with: &container_changeset/2)
    |> validate_required([:namespace])
  end

  def container_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(image args)a)
    |> cast_embed(:env, with: &env_changeset/2)
    |> cast_embed(:env_from, with: &env_from_changeset/2)
    |> validate_required([:image])
  end

  def env_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(value name)a)
    |> validate_required(~w(value name)a)
  end

  def env_from_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(secret config_map)a)
    |> validate_required(~w(secret config_map)a)
  end
end
