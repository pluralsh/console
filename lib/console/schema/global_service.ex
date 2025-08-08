defmodule Console.Schema.GlobalService do
  use Console.Schema.Base
  alias Console.Schema.{
    User,
    Service,
    Cluster,
    Project,
    ClusterProvider,
    ServiceTemplate,
    TemplateContext,
    PolicyBinding
  }
  alias Console.Deployments.Policies.Rbac

  schema "global_services" do
    field :reparent, :boolean
    field :name,     :string
    field :distro,   Cluster.Distro
    field :mgmt,     :boolean
    field :interval, :string
    field :next_poll_at, :utc_datetime_usec

    embeds_one :cascade, Cascade, on_replace: :update do
      field :delete, :boolean
      field :detach, :boolean
    end

    embeds_many :tags, Tag, on_replace: :delete do
      field :name,  :string
      field :value, :string
    end

    belongs_to :project,  Project
    belongs_to :template, ServiceTemplate, on_replace: :update
    belongs_to :service,  Service
    belongs_to :parent,   Service
    belongs_to :provider, ClusterProvider

    has_one :context, TemplateContext, foreign_key: :global_id, on_replace: :delete

    timestamps()
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

  def for_project(query \\ __MODULE__, id) do
    from(g in query, where: g.project_id == ^id)
  end

  def service_ids(query \\ __MODULE__, id) do
    from(g in query,
      join: s in Service,
        on: s.owner_id == g.id,
      where: g.id == ^id,
      select: s.id
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(g in query, order_by: ^order)
  end

  def pollable(query \\ __MODULE__) do
    now = DateTime.utc_now()
    from(g in query,
      where: is_nil(g.next_poll_at) or g.next_poll_at < ^now,
      order_by: [asc: :next_poll_at]
    )
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:context, template: :dependencies, service: :dependencies]) do
    from(g in query, preload: ^preloads)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(name reparent mgmt service_id parent_id project_id distro provider_id interval)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:template)
    |> cast_assoc(:context)
    |> cast_embed(:tags, with: &tag_changeset/2)
    |> cast_embed(:cascade, with: &cascade_changeset/2)
    |> unique_constraint(:service_id)
    |> duration(:interval)
    |> unique_constraint(:name)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:provider_id)
    |> validate_required(~w(name)a)
    |> validate_one_present([:service_id, :template])
  end

  def tag_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required(~w(name value)a)
  end

  def cascade_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(delete detach)a)
  end

  def next_poll_changeset(model, interval) do
    duration = poll_duration(interval)
    jittered = Duration.add(duration, Duration.new!(second: jitter(duration)))

    Ecto.Changeset.change(model, %{next_poll_at: DateTime.shift(DateTime.utc_now(), jittered)})
  end

  def poll_duration(interval) when is_binary(interval) do
    case parse_duration(interval) do
      {:ok, duration} -> duration
      {:error, _} -> poll_duration(nil)
    end
  end
  def poll_duration(_), do: Duration.new!(minute: 10)
end
