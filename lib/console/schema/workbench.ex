defmodule Console.Schema.Workbench do
  use Console.Schema.Base
  alias Console.Schema.{
    Project,
    Service,
    GitRepository,
    AgentRuntime,
    WorkbenchJob,
    WorkbenchToolAssociation,
    PolicyBinding,
    User,
    AgentRun
  }
  alias Console.Deployments.Policies.Rbac

  schema "workbenches" do
    field :name,           :string
    field :description,    :string
    field :system_prompt,  :binary

    embeds_one :configuration, Configuration, on_replace: :update do
      embeds_one :infrastructure, Infrastructure, on_replace: :update do
        field :services,   :boolean
        field :stacks,     :boolean
        field :kubernetes, :boolean
      end

      embeds_one :coding, Coding, on_replace: :update do
        field :mode,         AgentRun.Mode
        field :repositories, {:array, :string}
      end
    end

    embeds_one :skills, Skills, on_replace: :update do
      embeds_one :ref, Service.GitRef, on_replace: :update
      field :files, {:array, :string}
    end

    field :read_policy_id, :binary_id
    field :write_policy_id, :binary_id

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    belongs_to :project,   Project
    belongs_to :repository, GitRepository
    belongs_to :agent_runtime, AgentRuntime

    has_many :jobs, WorkbenchJob, on_replace: :delete
    has_many :tool_associations, WorkbenchToolAssociation, on_replace: :delete
    has_many :tools, through: [:tool_associations, :tool]

    timestamps()
  end

  def for_project(query \\ __MODULE__, project_id) do
    from(w in query, where: w.project_id == ^project_id)
  end

  def for_repository(query \\ __MODULE__, repository_id) do
    from(w in query, where: w.repository_id == ^repository_id)
  end

  def for_agent_runtime(query \\ __MODULE__, runtime_id) do
    from(w in query, where: w.agent_runtime_id == ^runtime_id)
  end

  def search(query \\ __MODULE__, q) do
    from(w in query, where: ilike(w.name, ^"%#{q}%"))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(w in query, order_by: ^order)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(w in query,
        join: p in assoc(w, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  @valid ~w(name description system_prompt project_id repository_id agent_runtime_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:tool_associations)
    |> cast_embed(:skills, with: &skills_changeset/2)
    |> cast_embed(:configuration, with: &configuration_changeset/2)
    |> unique_constraint(:name)
    |> foreign_key_constraint(:project_id)
    |> foreign_key_constraint(:repository_id)
    |> foreign_key_constraint(:agent_runtime_id)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name])
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end

  def skills_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(files)a)
    |> cast_embed(:ref)
    |> validate_required([:ref, :files])
  end

  def configuration_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_embed(:infrastructure, with: &infrastructure_changeset/2)
    |> cast_embed(:coding, with: &coding_changeset/2)
  end

  def infrastructure_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(services stacks kubernetes)a)
  end

  def coding_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(mode repositories)a)
  end
end
