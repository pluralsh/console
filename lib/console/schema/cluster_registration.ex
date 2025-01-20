defmodule Console.Schema.ClusterRegistration do
  use Piazza.Ecto.Schema
  import Console.Deployments.Ecto.Validations
  alias Console.Schema.{Project, User}

  schema "cluster_registrations" do
    field :name,       :string
    field :handle,     :string
    field :machine_id, :string
    field :metadata,   :map

    embeds_many :tags, Tag, on_replace: :delete do
      field :name,   :string
      field :value,  :string
    end

    belongs_to :project, Project
    belongs_to :creator, User

    timestamps()
  end

  def for_project(query \\ __MODULE__, pid) do
    from(cr in query, where: cr.project_id == ^pid)
  end

  def for_creator(query \\ __MODULE__, pid) do
    from(cr in query, where: cr.creator_id == ^pid)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(cr in query, order_by: ^order)
  end

  @valid ~w(name handle metadata project_id creator_id machine_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> kubernetes_name(:name)
    |> unique_constraint(:handle)
    |> unique_constraint(:machine_id)
    |> cast_embed(:tags, with: &tag_changeset/2)
    |> backfill_handle()
    |> validate_required(~w(project_id creator_id)a)
  end

  def update_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> validate_required(~w(name handle)a)
  end

  defp tag_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required(~w(name value)a)
  end

  defp backfill_handle(cs) do
    case {get_field(cs, :handle), get_field(cs, :name)} do
      {nil, n} -> put_change(cs, :handle, n)
      _ -> cs
    end
  end
end
