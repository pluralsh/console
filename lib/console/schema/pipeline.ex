defmodule Console.Schema.Pipeline do
  use Piazza.Ecto.Schema
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{PolicyBinding, PipelineStage, PipelineEdge, User, Project, Flow}

  schema "pipelines" do
    field :name,            :string
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id

    belongs_to :project, Project
    belongs_to :flow,    Flow

    has_many :stages, PipelineStage, on_replace: :delete
    has_many :edges,  PipelineEdge, on_replace: :delete
    has_many :gates, through: [:edges, :gates]

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

  def for_flow(query \\ __MODULE__, flow_id) do
    from(p in query, where: p.flow_id == ^flow_id)
  end

  def search(query \\ __MODULE__, q) do
    from(p in query, where: ilike(p.name, ^"%#{q}%"))
  end

  def for_project(query \\ __MODULE__, pid) do
    from(p in query, where: p.project_id == ^pid)
  end

  def gate_statuses(query \\ __MODULE__) do
    from(p in query,
      left_join: g in assoc(p, :gates),
      group_by: p.id,
      select: %{
        id: p.id,
        pending: sum(fragment("case when ? = 0 then 1 else 0 end", g.state)),
        closed: sum(fragment("case when ? = 2 then 1 else 0 end", g.state)),
        running: sum(fragment("case when ? = 3 then 1 else 0 end", g.state)),
      }
    )
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(p in query,
        join: pr in assoc(p, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id
               or b.policy_id == pr.read_policy_id or b.policy_id == pr.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name project_id flow_id)a)
    |> cast_assoc(:stages)
    |> cast_assoc(:edges)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> foreign_key_constraint(:project_id)
    |> foreign_key_constraint(:flow_id)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required(~w(name project_id)a)
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end
end
