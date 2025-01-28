defmodule Console.Schema.ClusterISOImage do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Project, User, PolicyBinding}
  alias Console.Deployments.Policies.Rbac

  schema "cluster_iso_images" do
    field :image,       :string
    field :registry,    :string
    field :user,        :string
    field :password,    Piazza.Ecto.EncryptedString

    belongs_to :project, Project
    belongs_to :creator, User

    timestamps()
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(c in query,
        join: p in assoc(c, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def for_project(query \\ __MODULE__, pid) do
    from(cr in query, where: cr.project_id == ^pid)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at, asc: :image]) do
    from(cr in query, order_by: ^order)
  end

  @valid ~w(image registry user password project_id creator_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(image registry project_id creator_id)a)
  end
end
