defmodule Console.Schema.Alert do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    Project,
    Cluster,
    Service,
    Tag,
    ObservabilityWebhook,
    AiInsight,
    AlertResolution
  }

  defenum Severity, low: 0, medium: 1, high: 2, critical: 3, undefined: 4
  defenum State, firing: 0, resolved: 1

  @expiry [days: -2]

  schema "alerts" do
    field :type,     ObservabilityWebhook.Type
    field :severity, Severity
    field :state,    State

    field :title,       :string
    field :message,     :string
    field :fingerprint, :string
    field :annotations, :map
    field :url,         :string

    belongs_to :insight, AiInsight, on_replace: :update

    belongs_to :project, Project
    belongs_to :cluster, Cluster
    belongs_to :service, Service

    has_one :resolution, AlertResolution

    has_many :tags, Tag, on_replace: :delete

    timestamps()
  end

  def firing(query \\ __MODULE__) do
    from(a in query, where: a.state == :firing)
  end

  def for_service(query \\ __MODULE__, id) do
    from(a in query, where: a.service_id == ^id)
  end

  def for_cluster(query \\ __MODULE__, id) do
    from(a in query, where: a.cluster_id == ^id)
  end

  def for_project(query \\ __MODULE__, id) do
    from(a in query, where: a.project_id == ^id)
  end

  def expired(query \\ __MODULE__) do
    at = Timex.now() |> Timex.shift(@expiry)
    from(a in query, where: coalesce(a.updated_at, a.inserted_at) < ^at)
  end

  def ordered(query \\ __MODULE__, order \\ nil)
  def ordered(query, nil) do
    from(a in query, order_by: [desc: coalesce(a.updated_at, a.inserted_at)])
  end
  def ordered(query, order), do: from(a in query, order_by: ^order)

  @valid ~w(type severity state title message fingerprint annotations url project_id cluster_id insight_id service_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:tags)
    |> cast_assoc(:insight)
    |> foreign_key_constraint(:project_id)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:insight_id)
    |> validate_required(~w(type title state severity message fingerprint)a)
  end
end
