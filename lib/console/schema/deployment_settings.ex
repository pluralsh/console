defmodule Console.Schema.DeploymentSettings do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PolicyBinding, GitRepository}

  defmodule Connection do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :host,     :string
      field :user,     :string
      field :password, Piazza.Ecto.EncryptedString
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(host user password)a)
      |> validate_required([:host])
    end
  end

  schema "deployment_settings" do
    field :name,             :string
    field :enabled,          :boolean
    field :self_managed,     :boolean
    field :write_policy_id,  :binary_id
    field :read_policy_id,   :binary_id
    field :create_policy_id, :binary_id
    field :git_policy_id,    :binary_id

    embeds_one :prometheus_connection, Connection, on_replace: :update
    embeds_one :loki_connection, Connection, on_replace: :update

    belongs_to :artifact_repository, GitRepository
    belongs_to :deployer_repository, GitRepository

    has_many :create_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :create_policy_id
    has_many :git_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :git_policy_id
    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    timestamps()
  end

  @valid ~w(name enabled self_managed artifact_repository_id deployer_repository_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:git_bindings)
    |> cast_assoc(:create_bindings)
    |> cast_embed(:prometheus_connection)
    |> cast_embed(:loki_connection)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:git_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:create_policy_id, &Ecto.UUID.generate/0)
  end
end
