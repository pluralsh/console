defmodule Console.Schema.WorkbenchTool do
  use Console.Schema.Base
  alias Console.Schema.{Project, PolicyBinding, User}
  alias Console.Deployments.Policies.Rbac

  defenum Tool, http: 0
  defenum Category, metrics: 0, logs: 1, integration: 2, ticketing: 3, traces: 4
  defenum HttpMethod, get: 0, post: 1, put: 2, delete: 3, patch: 4

  schema "workbench_tools" do
    field :tool,            Tool
    field :categories,      {:array, Category}
    field :name,            :string

    embeds_one :configuration, Configuration, on_replace: :update do
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

    belongs_to :project, Project

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

  @valid ~w(tool categories name project_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> foreign_key_constraint(:project_id)
    |> cast_embed(:configuration, with: &configuration_changeset/2)
    |> validate_format(:name, ~r/^[a-z0-9]([_a-z0-9]*[a-z0-9])?$/, message: "must be a valid name for OpenAI or equivalent tool calls (only a-z, 0-9, and underscores allowed)")
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name, :tool])
    |> infer_categories()
  end

  defp infer_categories(changeset) do
    case get_field(changeset, :categories) do
      nil -> put_change(changeset, :categories, categories(get_field(changeset, :tool)))
      _ -> changeset
    end
  end

  defp categories(:http), do: [:integration]
  defp categories(:datadog), do: [:metrics, :logs]
  defp categories(:newrelic), do: [:metrics, :logs]
  defp categories(:splunk), do: [:logs]
  defp categories(:prometheus), do: [:metrics]
  defp categories(:loki), do: [:logs]
  defp categories(:elastic), do: [:logs]
  defp categories(:tempo), do: [:traces]
  defp categories(_), do: [:integration]

  defp configuration_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:http, with: &http_configuration_changeset/2)
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

  defp header_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required([:name, :value])
  end
end
