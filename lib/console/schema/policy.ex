defmodule Console.Schema.Policy do
  use Console.Schema.Base
  alias Console.Schema.{BindingPolicy, Project, StackPolicy, WorkbenchPolicy}

  defenum Type, workbench: 0, stack: 1, binding: 3

  schema "policies" do
    field :name,        :string
    field :type,        Type, default: :workbench
    field :description, :string
    field :policy,      :binary

    belongs_to :project, Project

    has_many :workbench_policies, WorkbenchPolicy, on_replace: :delete
    has_many :workbenches, through: [:workbench_policies, :workbench]
    has_many :binding_policies, BindingPolicy, on_replace: :delete
    has_many :stack_policies, StackPolicy, on_replace: :delete
    has_many :stacks, through: [:stack_policies, :stack]

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

  @valid ~w(name type description policy project_id)a
  @policy_source_max 1_000_000

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> foreign_key_constraint(:project_id)
    |> validate_required([:name, :type, :policy, :project_id])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 1_000)
    |> validate_policy_source()
  end

  def source_changeset(source) do
    %__MODULE__{}
    |> cast(%{policy: source}, [:policy])
    |> validate_required([:policy])
    |> validate_policy_source()
  end

  defp validate_policy_source(changeset) do
    changeset = validate_length(changeset, :policy, max: @policy_source_max)
    validate_policy_rego(changeset, policy_length_error?(changeset))
  end

  defp validate_policy_rego(changeset, true), do: changeset
  defp validate_policy_rego(changeset, false),
    do: validate_change(changeset, :policy, &validate_rego/2)

  defp policy_length_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:policy, {_, opts}} -> Keyword.get(opts, :validation) == :length
      _ -> false
    end)
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
