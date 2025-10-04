defmodule Console.Schema.Gates.ResourceRequests do
  use Piazza.Ecto.Schema

  embedded_schema do
    field :cpu,    :string
    field :memory, :string
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(cpu memory)a)
  end
end

defmodule Console.Schema.Gates.Resources do
  use Piazza.Ecto.Schema

  alias Console.Schema.Gates.ResourceRequests

  embedded_schema do
    embeds_one :requests, ResourceRequests, on_replace: :update
    embeds_one :limits, ResourceRequests, on_replace: :update
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_embed(:requests)
    |> cast_embed(:limits)
  end
end

defmodule Console.Schema.Gates.JobSpec do
  use Piazza.Ecto.Schema

  alias Console.Schema.Gates.Resources

  embedded_schema do
    field :namespace,       :string
    field :raw,             :string
    field :service_account, :string
    field :labels,          :map
    field :annotations,     :map
    field :node_selector,   :map

    embeds_many :tolerations, Toleration, on_replace: :delete do
      field :key,       :string
      field :operator,  :string
      field :value,     :string
      field :effect,    :string
    end

    embeds_one :resources, Resources, on_replace: :update

    embeds_many :containers, Container, on_replace: :delete do
      field :name,  :string
      field :image, :string
      field :args,  {:array, :string}, default: []

      embeds_many :env, Env, on_replace: :delete do
        field :name,  :string
        field :value, :string
      end

      embeds_many :env_from, EnvFrom, on_replace: :delete do
        field :secret,     :string
        field :config_map, :string
      end

      embeds_one :resources, Resources, on_replace: :update
    end
  end

  @valid ~w(namespace raw labels annotations service_account node_selector)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:containers, with: &container_changeset/2)
    |> cast_embed(:tolerations, with: &toleration_changeset/2)
    |> cast_embed(:resources)
    |> validate_required([:namespace])
  end

  def container_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name image args)a)
    |> cast_embed(:env, with: &env_changeset/2)
    |> cast_embed(:env_from, with: &env_from_changeset/2)
    |> cast_embed(:resources)
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

  def toleration_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(key operator value effect)a)
    |> validate_required(~w(key operator value effect)a)
  end
end
