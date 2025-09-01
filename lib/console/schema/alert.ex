defmodule Console.Schema.Alert do
  use Console.Schema.Base
  alias Console.Schema.{
    Project,
    Cluster,
    Service,
    Tag,
    ObservabilityWebhook,
    AiInsight,
    AlertResolution,
    Flow
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

    field :ai_poll_at, :utc_datetime_usec

    embeds_one :stacktrace, Stacktrace, on_replace: :update do
      field :type,  :string
      field :value, :string

      embeds_many :frames, Frame, on_replace: :delete do
        field :file,         :string
        field :line,         :integer
        field :column,       :integer
        field :function,     :string
        field :context_line, :string
        field :vars,         :map
      end
    end

    belongs_to :insight, AiInsight, on_replace: :update

    belongs_to :project, Project
    belongs_to :cluster, Cluster
    belongs_to :service, Service
    belongs_to :flow,    Flow

    has_one :resolution, AlertResolution

    has_many :tags, Tag, on_replace: :delete

    timestamps()
  end

  def ai_pollable(query \\ __MODULE__) do
    now = DateTime.utc_now()
    from(a in query,
      where: is_nil(a.ai_poll_at) or a.ai_poll_at < ^now,
      order_by: [asc: :ai_poll_at]
    )
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

  def for_flow(query \\ __MODULE__, id) do
    from(a in query,
      join: s in assoc(a, :service),
      where: s.flow_id == ^id
    )
  end

  def distinct(query \\ __MODULE__) do
    from(a in query, distinct: true)
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

  def for_state(query \\ __MODULE__, state) do
    from(a in query, where: a.state == ^state)
  end

  def for_types(query \\ __MODULE__, types) do
    from(a in query, where: a.type in ^types)
  end

  def for_severities(query \\ __MODULE__, severities) do
    from(a in query, where: a.severity in ^severities)
  end

  @valid ~w(type severity state title message fingerprint annotations url project_id flow_id cluster_id insight_id service_id ai_poll_at)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:tags)
    |> cast_assoc(:insight)
    |> cast_embed(:stacktrace, with: &stacktrace_changeset/2)
    |> foreign_key_constraint(:project_id)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:insight_id)
    |> validate_required(~w(type title state severity message fingerprint)a)
    |> validate_one_present(~w(project_id cluster_id service_id flow_id)a)
  end

  def stacktrace_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(type value)a)
    |> cast_embed(:frames, with: &frame_changeset/2)
  end

  def frame_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(file line column function context_line vars)a)
  end
end
