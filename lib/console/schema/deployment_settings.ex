defmodule Console.Schema.DeploymentSettings do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PolicyBinding, GitRepository, Gates.JobSpec}
  alias Piazza.Ecto.EncryptedString

  defenum AIProvider, openai: 0, anthropic: 1, ollama: 2

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
    field :agent_version,    :string
    field :manage_agents,    :boolean, default: true
    field :write_policy_id,  :binary_id
    field :read_policy_id,   :binary_id
    field :create_policy_id, :binary_id
    field :git_policy_id,    :binary_id

    field :agent_helm_values, EncryptedString

    field :helm_changed, :boolean, virtual: true
    field :version_changed, :boolean, virtual: true

    embeds_one :prometheus_connection, Connection, on_replace: :update
    embeds_one :loki_connection, Connection, on_replace: :update

    embeds_one :stacks, Stacks, on_replace: :update do
      embeds_one :job_spec, JobSpec, on_replace: :update
      field :connection_id, :binary_id
    end

    embeds_one :smtp, SMTP, on_replace: :update do
      field :server,   :string
      field :port,     :integer
      field :sender,   :string
      field :user,     :string
      field :password, EncryptedString
      field :ssl,      :boolean
    end

    embeds_one :ai, AI, on_replace: :update do
      field :enabled, :boolean, default: false
      field :provider, AIProvider, default: :openai

      embeds_one :openai, OpenAi, on_replace: :update do
        field :access_key, EncryptedString
        field :model,      :string
      end

      embeds_one :anthropic, Anthropic, on_replace: :update do
        field :access_key, EncryptedString
        field :model,      :string
      end

      embeds_one :ollama, Ollama, on_replace: :update do
        field :model,         :string
        field :url,           :string
        field :authorization, EncryptedString
      end
    end

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

  @smtp ~w(sender port server user password ssl)a

  def smtp_config(), do: @smtp

  @valid ~w(name enabled agent_version agent_helm_values manage_agents self_managed artifact_repository_id deployer_repository_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:git_bindings)
    |> cast_assoc(:create_bindings)
    |> cast_embed(:prometheus_connection)
    |> cast_embed(:loki_connection)
    |> cast_embed(:ai, with: &ai_changeset/2)
    |> cast_embed(:smtp, with: &smtp_changeset/2)
    |> cast_embed(:stacks, with: &stacks_changeset/2)
    |> change_markers(agent_helm_values: :helm_changed, agent_version: :version_changed)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:git_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:create_policy_id, &Ecto.UUID.generate/0)
  end

  defp stacks_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(connection_id)a)
    |> cast_embed(:job_spec)
  end

  defp smtp_changeset(model, attrs) do
    model
    |> cast(attrs, @smtp)
    |> validate_required(@smtp)
  end

  defp ai_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(enabled provider)a)
    |> cast_embed(:openai, with: &ai_api_changeset/2)
    |> cast_embed(:anthropic, with: &ai_api_changeset/2)
    |> cast_embed(:ollama, with: &ollama_changeset/2)
  end

  defp ai_api_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(access_key model)a)
  end

  defp ollama_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url model authorization)a)
    |> validate_required(~w(url model)a)
  end
end
