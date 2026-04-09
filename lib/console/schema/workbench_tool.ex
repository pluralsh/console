defmodule Console.Schema.WorkbenchTool do
  use Console.Schema.Base
  alias Console.Schema.{Project, PolicyBinding, User, McpServer}
  alias Console.Deployments.Policies.Rbac
  alias Piazza.Ecto.EncryptedString

  defenum Tool, http: 0, elastic: 1, datadog: 2, prometheus: 3, loki: 4, tempo: 5, sentry: 6, mcp: 7, linear: 8, atlassian: 9, splunk: 10, dynatrace: 11, cloudwatch: 12
  defenum Category, metrics: 0, logs: 1, integration: 2, ticketing: 3, traces: 4, error_tracking: 5
  defenum HttpMethod, get: 0, post: 1, put: 2, delete: 3, patch: 4

  schema "workbench_tools" do
    field :tool,            Tool
    field :categories,      {:array, Category}
    field :name,            :string

    embeds_one :configuration, Configuration, on_replace: :update do
      embeds_one :elastic, ElasticConnection, on_replace: :update do
        field :url,      :string
        field :username, :string
        field :password, EncryptedString
        field :index,    :string
      end

      embeds_one :sentry, SentryConnection, on_replace: :update do
        field :url,          :string
        field :access_token, EncryptedString
        field :path,         :string
        field :agent_mode,   :boolean
      end

      embeds_one :linear, LinearConnection, on_replace: :update do
        field :access_token, EncryptedString
      end

      embeds_one :atlassian, AtlassianConnection, on_replace: :update do
        field :service_account, EncryptedString
        field :api_token,       EncryptedString
        field :email,           :string
      end

      embeds_one :prometheus, PrometheusConnection, on_replace: :update do
        field :url,       :string
        field :token,     EncryptedString
        field :tenant_id, :string
        field :username,  :string
        field :password,  EncryptedString
      end

      embeds_one :loki, LokiConnection, on_replace: :update do
        field :url,       :string
        field :token,     EncryptedString
        field :tenant_id, :string
        field :username,  :string
        field :password,  EncryptedString
      end

      embeds_one :splunk, SplunkConnection, on_replace: :update do
        field :url,      :string
        field :token,    EncryptedString
        field :username, :string
        field :password, EncryptedString
      end

      embeds_one :tempo, TempoConnection, on_replace: :update do
        field :url,       :string
        field :token,     EncryptedString
        field :tenant_id, :string
        field :username,  :string
        field :password,  EncryptedString
      end

      embeds_one :datadog, DatadogConnection, on_replace: :update do
        field :site,      :string
        field :api_key,   EncryptedString
        field :app_key,   EncryptedString
      end

      embeds_one :dynatrace, DynatraceConnection, on_replace: :update do
        field :url,            :string
        field :platform_token, EncryptedString
      end

      embeds_one :cloudwatch, CloudwatchConnection, on_replace: :update do
        field :region,            :string
        field :log_group_names,   {:array, :string}
        field :access_key_id,     EncryptedString
        field :secret_access_key, EncryptedString
        field :role_arn,          :string
        field :external_id,       EncryptedString
        field :role_session_name, :string
      end

      embeds_one :http, HttpConfiguration, on_replace: :update do
        field :url,          :string
        field :method,       HttpMethod

        embeds_many :headers, Header, on_replace: :delete do
          field :name,  :string
          field :value, :string
        end

        field :body,         :string
        field :input_schema, :map
      end
    end

    field :read_policy_id,  :binary_id
    field :write_policy_id, :binary_id

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    belongs_to :project,    Project
    belongs_to :mcp_server, McpServer

    timestamps()
  end

  def for_project(query \\ __MODULE__, project_id) do
    from(t in query, where: t.project_id == ^project_id)
  end

  def search(query \\ __MODULE__, q) do
    from(t in query, where: ilike(t.name, ^"%#{q}%"))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(t in query, order_by: ^order)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(t in query,
        join: p in assoc(t, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  @valid ~w(tool categories name project_id mcp_server_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> then(fn cs -> cast_embed(cs, :configuration, with: &configuration_changeset(&1, &2, get_field(cs, :tool))) end)
    |> foreign_key_constraint(:project_id)
    |> validate_format(:name, ~r/^[a-z0-9]([\._a-z0-9]*[a-z0-9])?$/, message: "must be a valid name for OpenAI or equivalent tool calls (only a-z, 0-9, .,  and underscores allowed)")
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name, :tool])
    |> infer_categories()
    |> ensure_mcp_server()
  end

  defp infer_categories(changeset) do
    case get_field(changeset, :categories) do
      [_ | _] -> valid_category(changeset, get_field(changeset, :tool))
      _ -> put_change(changeset, :categories, categories(get_field(changeset, :tool)))
    end
  end

  defp valid_category(changeset, tool) do
    validate_change(changeset, :categories, fn :categories, categories ->
      cats = categories(tool)
      case MapSet.subset?(MapSet.new(categories), MapSet.new(cats)) do
        true -> []
        false -> [categories: "must be a subset of #{inspect(cats)} for a #{tool} tool"]
      end
    end)
  end

  defp ensure_mcp_server(changeset) do
    case get_field(changeset, :tool) do
      :mcp -> validate_required(changeset, [:mcp_server_id])
      _ -> changeset
    end
  end

  defp categories(:http), do: [:integration]
  defp categories(:datadog), do: [:metrics, :logs]
  defp categories(:dynatrace), do: [:metrics, :logs, :traces]
  defp categories(:cloudwatch), do: [:metrics, :logs]
  defp categories(:newrelic), do: [:metrics, :logs]
  defp categories(:splunk), do: [:logs]
  defp categories(:prometheus), do: [:metrics]
  defp categories(:loki), do: [:logs]
  defp categories(:elastic), do: [:logs]
  defp categories(:tempo), do: [:traces]
  defp categories(:sentry), do: [:error_tracking]
  defp categories(:linear), do: [:integration]
  defp categories(:atlassian), do: [:integration]
  defp categories(_), do: [:integration]

  defp configuration_changeset(model, attrs, tool) do
    model
    |> cast(attrs, [])
    |> cast_embed(:http, with: &http_configuration_changeset/2)
    |> cast_embed(:elastic, with: &elastic_configuration_changeset/2)
    |> cast_embed(:prometheus, with: &prom_configuration_changeset/2)
    |> cast_embed(:loki, with: &prom_configuration_changeset/2)
    |> cast_embed(:splunk, with: &splunk_configuration_changeset/2)
    |> cast_embed(:tempo, with: &prom_configuration_changeset/2)
    |> cast_embed(:datadog, with: &datadog_configuration_changeset/2)
    |> cast_embed(:dynatrace, with: &dynatrace_configuration_changeset/2)
    |> cast_embed(:cloudwatch, with: &cloudwatch_configuration_changeset/2)
    |> cast_embed(:sentry, with: &sentry_configuration_changeset/2)
    |> cast_embed(:linear, with: &linear_configuration_changeset/2)
    |> cast_embed(:atlassian, with: &atlassian_configuration_changeset/2)
    |> validate_required(if tool == :mcp, do: [], else: [tool])
  end

  defp http_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url method body input_schema)a)
    |> cast_embed(:headers, with: &header_changeset/2)
    |> validate_change(:input_schema, fn :input_schema, input_schema ->
      case ExJsonSchema.Schema.resolve(input_schema) do
        %ExJsonSchema.Schema.Root{} -> []
        {:error, errors} -> [input_schema: "is not a valid JSON schema: #{inspect(errors)}"]
      end
    end)
    |> validate_required([:url, :method, :input_schema])
  end

  defp prom_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url token tenant_id username password)a)
    |> validate_required([:url])
  end

  defp datadog_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(site api_key app_key)a)
    |> validate_required([:api_key])
  end

  defp dynatrace_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url platform_token)a)
    |> validate_required([:url, :platform_token])
  end

  defp cloudwatch_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(region log_group_names access_key_id secret_access_key role_arn external_id role_session_name)a)
    |> then(fn cs ->
      case {get_field(cs, :access_key_id), get_field(cs, :secret_access_key)} do
        {"", _} -> add_error(cs, :access_key_id, "must be set with secret_access_key")
        {_, ""} -> add_error(cs, :secret_access_key, "must be set with access_key_id")
        {nil, nil} -> cs
        {id, secret} when is_binary(id) and id != "" and is_binary(secret) and secret != "" -> cs
        {nil, _} -> add_error(cs, :access_key_id, "must be set with secret_access_key")
        {_, nil} -> add_error(cs, :secret_access_key, "must be set with access_key_id")
        _ -> cs
      end
    end)
    |> validate_required([:region])
  end

  defp splunk_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url token username password)a)
    |> then(fn cs ->
      case {get_field(cs, :token), get_field(cs, :username), get_field(cs, :password)} do
        {token, _, _} when is_binary(token) and token != "" -> cs
        {_, user, pass} when is_binary(user) and user != "" and is_binary(pass) and pass != "" -> cs
        _ -> add_error(cs, :token, "either token or username/password must be set")
      end
    end)
    |> validate_required([:url])
  end

  defp elastic_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url username password index)a)
    |> validate_required([:url, :username, :password, :index])
  end

  defp sentry_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url access_token path agent_mode)a)
    |> validate_required([:access_token])
  end

  defp linear_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(access_token)a)
    |> validate_required([:access_token])
  end

  defp atlassian_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(service_account api_token email)a)
    |> then(fn cs ->
      case get_field(cs, :service_account) do
        sa when is_binary(sa) -> cs
        _ -> validate_required(cs, [:api_token, :email])
      end
    end)
  end

  defp header_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required([:name, :value])
  end
end
