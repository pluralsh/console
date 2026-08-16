defmodule Console.Schema.Policy do
  use Console.Schema.Base
  alias Console.Schema.{Project, WorkbenchPolicy}

  schema "policies" do
    field :name,        :string
    field :description, :string
    field :policy,      :binary

    belongs_to :project, Project

    has_many :workbench_policies, WorkbenchPolicy, on_replace: :delete
    has_many :workbenches, through: [:workbench_policies, :workbench]

    timestamps()
  end

  def for_project(query \\ __MODULE__, project_id) do
    from(p in query, where: p.project_id == ^project_id)
  end

  def for_user(query \\ __MODULE__, user) do
    projects = Project.for_user(user)

    from(p in query,
      join: project in subquery(projects),
      on: project.id == p.project_id
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  def search(query \\ __MODULE__, q) do
    from(p in query, where: ilike(p.name, ^"%#{q}%"))
  end

  @valid ~w(name description policy project_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> foreign_key_constraint(:project_id)
    |> validate_required([:name, :policy, :project_id])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 1_000)
    |> validate_length(:policy, max: 1_000_000)
    |> validate_change(:policy, &validate_rego/2)
  end

  defp validate_rego(:policy, policy) when is_binary(policy) do
    with {:ok, engine} <- Regolix.new(),
         {:ok, _} <- Regolix.add_policy(engine, "policy.rego", policy) do
      []
    else
      {:error, reason} -> [policy: "invalid rego policy: #{inspect(reason)}"]
    end
  end
  defp validate_rego(_, _), do: []
end
