defmodule Console.Schema.PrAutomation do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, Service, ScmConnection, PolicyBinding}

  defenum MatchStrategy, any: 0, all: 1, recursive: 2

  schema "pr_automations" do
    field :identifier,       :string
    field :name,             :string
    field :documentation,    :binary
    field :addon,            :string
    field :title,            :string
    field :message,          :binary
    field :branch,           :string
    field :write_policy_id,  :binary_id
    field :create_policy_id, :binary_id

    embeds_one :updates, UpdateSpec, on_replace: :update do
      field :regexes,          {:array, :string}
      field :files,            {:array, :string}
      field :replace_template, :string
      field :yq,               :string
      field :match_strategy,   MatchStrategy
    end

    belongs_to :cluster,    Cluster
    belongs_to :service,    Service
    belongs_to :connection, ScmConnection

    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    has_many :create_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name identifier message title branch documentation addon cluster_id service_id connection_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:updates)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:create_bindings)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:create_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name, :title, :message, :connection_id])
    |> unique_constraint(:name)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:connection_id)
  end

  def spec_changeset(model, attrs \\ %{}) do
    cast(model, attrs, ~w(regexes files yq replace_template match_strategy)a)
  end
end
