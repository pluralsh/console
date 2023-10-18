defmodule Console.Schema.ClusterNodePool do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster}

  defmodule CloudSettings do
    use Piazza.Ecto.Schema

    embedded_schema do
      embeds_one :aws, Aws, on_replace: :update do
        field :launch_template_id, :string
      end
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, [])
      |> cast_embed(:aws, with: &aws_changeset/2)
    end

    def aws_changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(launch_template_id)a)
    end
  end

  schema "cluster_node_pools" do
    field :name,           :string
    field :min_size,       :integer
    field :max_size,       :integer
    field :instance_type,  :string
    field :labels,         :map
    field :spot,           :boolean, default: false

    embeds_many :taints, Taint, on_replace: :delete do
      field :key,    :string
      field :value,  :string
      field :effect, :string
    end

    embeds_one :cloud_settings, CloudSettings, on_replace: :update
    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(cnp in query, where: cnp.cluster_id == ^cluster_id)
  end

  @valid ~w(name min_size max_size instance_type labels cluster_id spot)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:taints, with: &taint_changeset/2)
    |> cast_embed(:cloud_settings)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required(~w(min_size max_size instance_type name)a)
  end

  @taint_valid ~w(key value effect)a

  def taint_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @taint_valid)
    |> validate_required(@taint_valid)
    |> validate_inclusion(:effect, ~w(PreferNoSchedule NoSchedule NoExecute))
  end
end
