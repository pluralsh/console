defmodule Console.Schema.DeploymentSettings do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PolicyBinding, GitRepository, Gates.JobSpec}
  alias Piazza.Ecto.EncryptedString

  defenum AIProvider, openai: 0, anthropic: 1, ollama: 2, azure: 3, bedrock: 4, vertex: 5
  defenum LogDriver, victoria: 0, elastic: 1, opensearch: 2
  defenum VectorStore, elastic: 0, opensearch: 1

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

    def headers(%__MODULE__{user: u, password: p}, headers) when is_binary(u) and is_binary(p) do
      [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | headers]
    end
    def headers(_, headers), do: headers

    def url(%__MODULE__{host: host}, path) when is_binary(host) do
      Path.join(host, path)
    end
  end

  defmodule Elastic do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :host,     :string
      field :index,    :string
      field :user,     :string
      field :password, EncryptedString
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(host index user password)a)
      |> validate_required([:host, :index])
    end

    def headers(%__MODULE__{user: u, password: p}, headers) when is_binary(u) and is_binary(p) do
      [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | headers]
    end

    def headers(_, headers), do: headers

    def url(%__MODULE__{host: host}, path) when is_binary(host) do
      Path.join(host, path)
    end
  end

  defmodule Opensearch do
    use Piazza.Ecto.Schema

    @aws_service_name "es"

    embedded_schema do
      field :host,     :string
      field :index,    :string
      field :aws_access_key_id, :string
      field :aws_secret_access_key, EncryptedString
      field :aws_region, :string
      field :aws_session_token, EncryptedString
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(host index aws_access_key_id aws_secret_access_key aws_region aws_session_token)a)
      |> validate_required([:host, :index])
    end

    def headers(%__MODULE__{} = os, headers) do
      session_token = Map.get(os, :aws_session_token) || System.get_env("AWS_SESSION_TOKEN")
      [{"X-Amz-Security-Token", session_token} | headers]
    end

    def aws_sigv4_headers(%__MODULE__{} = os) do
      [
        service: @aws_service_name,
        region: Map.get(os, :aws_region) || System.get_env("AWS_REGION"),
        access_key_id: Map.get(os, :aws_access_key_id) || System.get_env("AWS_ACCESS_KEY_ID"),
        secret_access_key: Map.get(os, :aws_secret_access_key) || System.get_env("AWS_SECRET_ACCESS_KEY")
      ]
    end

    def url(%__MODULE__{host: host}, path) when is_binary(host) do
      Path.join(host, path)
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
    field :mgmt_repo,        :string
    field :onboarded,        :boolean, default: false

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

    embeds_one :logging, Logging, on_replace: :update do
      field :enabled,  :boolean
      field :driver,   LogDriver

      embeds_one :victoria, Connection, on_replace: :update
      embeds_one :elastic,  Elastic, on_replace: :update
      embeds_one :opensearch, Opensearch, on_replace: :update
    end

    embeds_one :cost, Cost, on_replace: :update do
      field :enabled, :boolean
      field :recommendation_threshold, :integer
      field :recommendation_cushion,   :integer
    end

    embeds_one :ai, AI, on_replace: :update do
      field :enabled,            :boolean, default: false
      field :provider,           AIProvider, default: :openai
      field :tool_provider,      AIProvider
      field :embedding_provider, AIProvider

      embeds_one :vector_store, VectorStore, on_replace: :update do
        field :enabled,     :boolean, default: false
        field :initialized, :boolean, default: false
        field :store,       VectorStore, default: :elastic

        embeds_one :elastic, Elastic, on_replace: :update
        embeds_one :opensearch, Opensearch, on_replace: :update
      end

      embeds_one :graph, Graph, on_replace: :update do
        field :enabled, :boolean, default: false
        field :store, VectorStore, default: :elastic

        embeds_one :elastic, Elastic, on_replace: :update
      end

      embeds_one :tools, ToolsConfig, on_replace: :update do
        embeds_one :create_pr, PrToolConfig, on_replace: :update do
          field :connection_id, :string
        end
      end

      embeds_one :openai, OpenAi, on_replace: :update do
        field :base_url,        :string
        field :access_token,    EncryptedString
        field :model,           :string
        field :tool_model,      :string
        field :embedding_model, :string
      end

      embeds_one :anthropic, Anthropic, on_replace: :update do
        field :base_url,        :string
        field :access_token,    EncryptedString
        field :model,           :string
        field :tool_model,      :string
        field :embedding_model, :string
      end

      embeds_one :ollama, Ollama, on_replace: :update do
        field :model,           :string
        field :tool_model,      :string
        field :url,             :string
        field :authorization,   EncryptedString
        field :embedding_model, :string
      end

      embeds_one :azure, Azure, on_replace: :update do
        field :api_version,     :string
        field :endpoint,        :string
        field :model,           :string
        field :tool_model,      :string
        field :embedding_model, :string
        field :access_key,      EncryptedString
      end

      embeds_one :bedrock, Bedrock, on_replace: :update do
        field :model_id,          :string
        field :tool_model_id,     :string
        field :access_key_id,     :string
        field :secret_access_key, EncryptedString
        field :embedding_model,   :string
      end

      embeds_one :vertex, Vertex, on_replace: :update do
        field :service_account_json, EncryptedString
        field :model,                :string
        field :tool_model,           :string
        field :project,              :string
        field :endpoint,             :string
        field :location,             :string
        field :embedding_model,      :string
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

  def onboarded_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(onboarded)a)
  end

  @valid ~w(name enabled mgmt_repo agent_version agent_helm_values manage_agents self_managed artifact_repository_id deployer_repository_id)a

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
    |> cast_embed(:cost, with: &cost_changeset/2)
    |> cast_embed(:logging, with: &logging_changeset/2)
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
    |> cast(attrs, ~w(enabled provider tool_provider embedding_provider)a)
    |> cast_embed(:tools, with: &tool_config_changeset/2)
    |> cast_embed(:vector_store, with: &vector_store_changeset/2)
    |> cast_embed(:graph, with: &graph_store_changeset/2)
    |> cast_embed(:openai, with: &ai_api_changeset/2)
    |> cast_embed(:anthropic, with: &ai_api_changeset/2)
    |> cast_embed(:ollama, with: &ollama_changeset/2)
    |> cast_embed(:azure, with: &azure_openai_changeset/2)
    |> cast_embed(:bedrock, with: &bedrock_changeset/2)
    |> cast_embed(:vertex, with: &vertex_changeset/2)
  end

  defp ai_api_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(access_token model tool_model embedding_model base_url)a)
  end

  defp ollama_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url model tool_model embedding_model authorization)a)
    |> validate_required(~w(url model)a)
  end

  defp azure_openai_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(endpoint api_version access_token tool_model embedding_model model)a)
    |> validate_required(~w(access_token endpoint)a)
    |> validate_change(:endpoint, fn :endpoint, endpoint ->
      with %URI{path: path, scheme: "https"} <- URI.parse(endpoint),
           true <- String.ends_with?(path, "/openai/deployments") do
        []
      else
        false -> [endpoint: "must end with /openai/deployments to be a valid azure openai base url"]
        _ -> [endpoint: "is not a valid url"]
      end
    end)
  end

  defp bedrock_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(model_id tool_model_id access_key_id secret_access_key)a)
    |> validate_required(~w(model_id)a)
  end

  defp vertex_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(model tool_model embedding_model service_account_json project location endpoint)a)
    |> validate_required([:project, :location])
    |> validate_change(:service_account_json, fn :service_account_json, json ->
      case Jason.decode(json) do
        {:ok, _} -> []
        _ -> [service_account_json: "is not valid json"]
      end
    end)
  end

  defp tool_config_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:create_pr, with: &create_pr_changeset/2)
  end

  defp create_pr_changeset(model, attrs) do
    model
    |> cast(attrs, [:connection_id])
    |> validate_required([:connection_id])
  end

  defp cost_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(enabled recommendation_threshold recommendation_cushion)a)
  end

  defp vector_store_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(enabled store)a)
    |> cast_embed(:elastic)
    |> cast_embed(:opensearch)
    |> set_initialized()
  end

  defp graph_store_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(enabled)a)
    |> cast_embed(:elastic)
  end

  defp logging_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(enabled driver)a)
    |> cast_embed(:victoria)
    |> cast_embed(:elastic)
    |> cast_embed(:opensearch)
  end

  defp set_initialized(changeset) do
    case {get_change(changeset, :store), get_change(changeset, :elastic), get_change(changeset, :opensearch)} do
      {:elastic, e, _} when not is_nil(e) ->
        put_change(changeset, :initialized, false)
      {:opensearch, _, o} when not is_nil(o) ->
        put_change(changeset, :initialized, false)
      _ -> changeset
    end
  end
end
