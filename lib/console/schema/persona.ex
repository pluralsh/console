defmodule Console.Schema.Persona do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PolicyBinding, User}

  defmodule Configuration do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :all, :boolean
      embeds_one :deployments, Deployments, on_replace: :update do
        boolean_fields [:clusters, :deployments, :services, :pipelines, :providers, :add_ons]
      end

      embeds_one :sidebar, Sidebar, on_replace: :update do
        boolean_fields [:all, :kubernetes, :audits, :pull_requests, :settings]
      end
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:all])
      |> cast_embed(:deployments, with: &deployments_cs/2)
      |> cast_embed(:sidebar, with: &sidebar_cs/2)
    end

    defp deployments_cs(model, attrs) do
      model
      |> cast(attrs, deployments_fields())
    end

    defp sidebar_cs(model, attrs) do
      model
      |> cast(attrs, sidebar_fields())
    end

    defp deployments_fields(), do: __MODULE__.Deployments.__schema__(:fields) -- [:id]
    defp sidebar_fields(), do: __MODULE__.Sidebar.__schema__(:fields) -- [:id]
  end

  schema "personas" do
    field :name,        :string
    field :description, :string
    field :bindings_id, :binary_id

    embeds_one :configuration, Configuration, on_replace: :update

    has_many :bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :bindings_id

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  def for_user(query \\ __MODULE__, %User{id: user_id} = user) do
    %{groups: groups} = Console.Repo.preload(user, [:groups])
    group_ids = Enum.map(groups, & &1.id)
    from(p in query,
      left_join: b in assoc(p, :bindings),
      where: b.user_id == ^user_id or b.group_id in ^group_ids,
      distinct: true
    )
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name description)a)
    |> cast_embed(:configuration)
    |> cast_assoc(:bindings)
    |> put_new_change(:bindings_id, &Ecto.UUID.generate/0)
    |> validate_required(~w(name)a)
  end
end
