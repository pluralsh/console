defmodule Console.Schema.DeploymentSettings do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PolicyBinding, GitRepository}

  schema "deployment_settings" do
    field :name,             :string
    field :write_policy_id,  :binary_id
    field :read_policy_id,   :binary_id
    field :create_policy_id, :binary_id
    field :git_policy_id,    :binary_id

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

  @valid ~w(name artifact_repository_id deployer_repository_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:git_bindings)
    |> cast_assoc(:create_bindings)
  end
end
