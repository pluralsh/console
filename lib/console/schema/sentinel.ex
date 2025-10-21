defmodule Console.Schema.Sentinel do
  use Console.Schema.Base
  alias Console.Schema.{
    SentinelRun,
    SentinelRunJob,
    GitRepository,
    Service,
    Cluster,
    Project,
    PolicyBinding,
    User,
    Gates.JobSpec
  }
  alias Console.Deployments.Policies.Rbac

  defenum CheckType, log: 0, kubernetes: 1, integration_test: 2

  schema "sentinels" do
    field :name,        :string
    field :status,      SentinelRun.Status, default: :pending
    field :description, :string
    field :last_run_at, :utc_datetime_usec

    belongs_to :repository, GitRepository
    belongs_to :project,    Project

    embeds_one :git, Service.Git, on_replace: :update

    embeds_many :checks, SentinelCheck, on_replace: :delete do
      field :type,      CheckType
      field :name,      :string
      field :rule_file, :string

      embeds_one :configuration, CheckConfiguration, on_replace: :update do
        embeds_one :log, LogConfiguration, on_replace: :update do
          field :query,      :string
          field :cluster_id, :binary_id
          field :namespaces, {:array, :string}
          field :duration,   :string

          embeds_many :facets, Facet, on_replace: :delete do
            field :key,  :string
            field :value, :string
          end
        end

        embeds_one :kubernetes, KubernetesConfiguration, on_replace: :update do
          field :group,      :string
          field :version,    :string
          field :kind,       :string
          field :name,       :string
          field :namespace,  :string
          field :cluster_id, :binary_id
        end

        embeds_one :integration_test, IntegrationTestConfiguration, on_replace: :update do
          embeds_one :job, JobSpec, on_replace: :update

          field :format, SentinelRunJob.Format, default: :junit
          field :tags,   :map
          field :distro, Cluster.Distro
        end
      end
    end

    timestamps()
  end

  def for_status(query \\ __MODULE__, status) do
    from(s in query, where: s.status == ^status)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(f in query,
        join: p in assoc(f, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def search(query \\ __MODULE__, search) do
    from(s in query, where: ilike(s.name, ^"%#{search}%"))
  end

  def statuses(query \\ __MODULE__) do
    from(s in query, group_by: s.status, select: %{status: s.status, count: count(s.id, :distinct)})
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(s in query, order_by: ^order)
  end

  @valid ~w(name description status last_run_at repository_id project_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> cast_embed(:checks, with: &check_changeset/2)
    |> validate_length(:name, max: 255)
    |> validate_required([:name, :status])
  end

  defp check_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(type name rule_file)a)
    |> cast_embed(:configuration, with: &configuration_changeset/2)
    |> validate_required([:type, :name])
  end

  defp configuration_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:log, with: &log_changeset/2)
    |> cast_embed(:kubernetes, with: &kubernetes_changeset/2)
    |> cast_embed(:integration_test, with: &integration_test_changeset/2)
  end

  defp log_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(query cluster_id namespaces duration)a)
    |> cast_embed(:facets, with: &facet_changeset/2)
    |> validate_required(~w(duration query)a)
  end

  defp facet_changeset(model, attrs) do
    cast(model, attrs, ~w(key value)a)
    |> validate_required(~w(key value)a)
  end

  defp kubernetes_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(group version kind name namespace cluster_id)a)
    |> validate_required(~w(version kind name cluster_id)a)
  end

  defp integration_test_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(tags distro format)a)
    |> cast_embed(:job)
    |> validate_required(~w(format)a)
  end
end
