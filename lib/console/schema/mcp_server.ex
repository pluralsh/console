defmodule Console.Schema.McpServer do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PolicyBinding, Project, User}
  alias Console.Deployments.Policies.Rbac

  schema "mcp_servers" do
    field :name,    :string
    field :url,     :string
    field :confirm, :boolean, default: false

    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id

    belongs_to :project, Project

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id

    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    embeds_one :authentication, Authentication, on_replace: :update do
      field :plural, :boolean

      embeds_many :headers, Header, on_replace: :delete do
        field :name,  :string
        field :value, :string
      end
    end

    embeds_one :capabilities, Capabilities, on_replace: :update do
      field :tools, :map
    end

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

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(m in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(url name confirm project_id)a)
    |> cast_embed(:authentication, with: &auth_changeset/2)
    |> foreign_key_constraint(:project_id)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required(~w(url name project_id)a)
  end

  defp auth_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(plural)a)
    |> cast_embed(:headers, with: &header_changeset/2)
  end

  defp header_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required(~w(name value)a)
  end
end
