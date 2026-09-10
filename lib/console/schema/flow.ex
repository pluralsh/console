defmodule Console.Schema.Flow do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    Project,
    PolicyBinding,
    User,
    McpServerAssociation,
    AgentRuntime,
    FlowWorkbench,
    Service
  }
  alias Console.Deployments.Policies.Rbac

  schema "flows" do
    field :name,         :string
    field :description,  :string
    field :icon,         :string
    field :repositories, {:array, :string}
    field :metadata,     :map
    field :max_previews, :integer, default: 10


    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id

    belongs_to :project,       Project
    belongs_to :agent_runtime, AgentRuntime

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id
    has_many :flow_workbenches, FlowWorkbench, on_replace: :delete
    has_many :workbenches, through: [:flow_workbenches, :workbench]
    has_many :server_associations, McpServerAssociation, on_replace: :delete
    has_many :servers, through: [:server_associations, :server]

    timestamps()
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(f in query,
        join: p in assoc(f, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == f.read_policy_id or b.policy_id == f.write_policy_id
                or b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def for_project(query \\ __MODULE__, project_id) do
    from(f in query, where: f.project_id == ^project_id)
  end

  def search(query \\ __MODULE__, q) do
    from(f in query, where: ilike(f.name, ^"%#{q}%"))
  end

  def stream(query \\ __MODULE__) do
    from(f in query, order_by: [asc: :id])
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(f in query, order_by: ^order)
  end

  def ordered_by_service_count(query \\ __MODULE__, dir \\ :desc) do
    counts =
      from(s in Service,
        group_by: s.flow_id,
        select: %{flow_id: s.flow_id, n: count(s.id)}
      )

    from(f in query,
      left_join: c in subquery(counts),
      on: c.flow_id == f.id,
      order_by: [{^dir, coalesce(c.n, 0)}, {^dir, f.name}]
    )
  end

  def ordered_by_favorites(query, [], dir), do: ordered(query, [{dir, :name}])
  def ordered_by_favorites(query, ids, dir) do
    from(f in query,
      order_by: [
        {:asc, fragment("CASE WHEN ? THEN 0 ELSE 1 END", f.id in ^ids)},
        {^dir, f.name}
      ]
    )
  end

  def with_service_statuses(query \\ __MODULE__, statuses)
  def with_service_statuses(query, statuses) when statuses in [nil], do: query
  def with_service_statuses(query, []), do: from(f in query, where: f.id in ^[])
  def with_service_statuses(query, statuses) do
    ids = Service.for_statuses(statuses) |> select([s], s.flow_id)
    from(f in query, where: f.id in subquery(ids))
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name description icon repositories project_id agent_runtime_id metadata max_previews)a)
    |> validate_length(:name, max: 255)
    |> cast_assoc(:server_associations)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:flow_workbenches)
    |> unique_constraint(:name)
    |> foreign_key_constraint(:project_id)
    |> foreign_key_constraint(:agent_runtime_id)
    |> validate_repositories()
    |> foreign_key_constraint(:preview_environment_instances, name: :preview_environment, match: :prefix, message: "Cannot delete as there are preview environments using this flow still deployed")
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_number(:max_previews, greater_than: 0, less_than_or_equal_to: 25)
    |> validate_required([:name, :project_id])
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end

  defp validate_repositories(cs) do
    with [_ | _] = repositories <- get_change(cs, :repositories),
         false <- Enum.all?(repositories, &is_https?/1) do
      add_error(cs, :repositories, "repositories must be git https urls")
    else
      _ -> cs
    end
  end

  defp is_https?("https://" <> _), do: true
  defp is_https?(_), do: false
end
