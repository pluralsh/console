defmodule Console.Schema.PullRequest do
  use Console.Schema.Base
  alias Console.Schema.{
    Cluster,
    Service,
    PolicyBinding,
    Stack,
    Flow,
    PrGovernance,
    AgentSession,
    AgentRun
  }

  defenum Status, open: 0, merged: 1, closed: 2

  schema "pull_requests" do
    field :url,              :string
    field :status,           Status, default: :open
    field :title,            :string
    field :body,             :string
    field :creator,          :string
    field :labels,           {:array, :string}
    field :ref,              :string
    field :sha,              :string
    field :polled_sha,       :string
    field :commit_sha,       :string
    field :approver,         :string
    field :preview,          :string
    field :attributes,       :map
    field :patch,            :binary
    field :agent_id,         :string
    field :approved,         :boolean, default: false
    field :governance_state, :map
    field :next_poll_at,     :utc_datetime_usec
    field :merge_cron,       :string
    field :merge_attempt_at, :utc_datetime_usec

    field :notifications_policy_id, :binary_id

    field :comment_id, :string, virtual: true

    belongs_to :cluster,    Cluster
    belongs_to :service,    Service
    belongs_to :stack,      Stack
    belongs_to :flow,       Flow
    belongs_to :governance, PrGovernance
    belongs_to :session,    AgentSession
    belongs_to :agent_run,  AgentRun

    has_many :notifications_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :notifications_policy_id

    timestamps()
  end

  def pollable(query \\ __MODULE__) do
    now = DateTime.utc_now()
    stale = Timex.shift(now, days: -7)
    from(pr in query,
      where: (is_nil(pr.next_poll_at) or pr.next_poll_at < ^now) and
             coalesce(pr.updated_at, pr.inserted_at) >= ^stale,
      order_by: [asc: :next_poll_at])
  end

  def mergeable(query \\ __MODULE__) do
    now = DateTime.utc_now()
    from(pr in query,
      where: not is_nil(pr.merge_attempt_at) and pr.merge_attempt_at <= ^now,
      order_by: [asc: :merge_attempt_at]
    )
  end

  def icon(%__MODULE__{status: :merged}), do: "✔"
  def icon(%__MODULE__{status: :closed}), do: "❌"
  def icon(_), do: ""

  def open(query \\ __MODULE__) do
    from(pr in query, where: pr.status == ^:open)
  end

  def search(query \\ __MODULE__, q) do
    from(pr in query, where: ilike(pr.title, ^"%#{q}%"))
  end

  def for_cluster(query \\ __MODULE__, cid) do
    from(pr in query, where: pr.cluster_id == ^cid)
  end

  def for_service(query \\ __MODULE__, sid) do
    from(pr in query, where: pr.service_id == ^sid)
  end

  def for_stack(query \\ __MODULE__, stack_id) do
    from(pr in query, where: pr.stack_id == ^stack_id)
  end

  def for_flow(query \\ __MODULE__, flow_id) do
    from(pr in query, where: pr.flow_id == ^flow_id)
  end

  def for_agent(query \\ __MODULE__, agent_id) do
    from(pr in query, where: pr.agent_id == ^agent_id)
  end

  def pending_governance(query \\ __MODULE__) do
    from(pr in query, where: not is_nil(pr.governance_id) and not pr.approved and pr.status == ^:open)
  end

  def stack(query \\ __MODULE__) do
    from(pr in query, where: not is_nil(pr.stack_id))
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(pr in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(
    url
    ref
    sha
    commit_sha
    approver
    status
    title
    body
    cluster_id
    stack_id
    service_id
    flow_id
    creator
    labels
    preview
    patch
    agent_id
    governance_id
    approved
    governance_state
    next_poll_at
    session_id
    agent_run_id
    merge_cron
    merge_attempt_at
  )a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:notifications_bindings)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:flow_id)
    |> put_new_change(:notifications_policy_id, &Ecto.UUID.generate/0)
    |> unique_constraint(:url)
    |> next_merge_attempt()
    |> validate_required(~w(url title)a)
  end

  def next_poll_changeset(model, interval) do
    duration = poll_duration(interval)
    jittered = Duration.add(duration, Duration.new!(second: jitter(duration)))

    Ecto.Changeset.change(model, %{
      next_poll_at: DateTime.shift(DateTime.utc_now(), jittered)
    })
  end

  def poll_duration(interval) when is_binary(interval) do
    case parse_duration(interval) do
      {:ok, duration} -> duration
      {:error, _} -> poll_duration(nil)
    end
  end
  def poll_duration(_), do: Duration.new!(minute: 5)

  defp next_merge_attempt(cs) do
    case get_next_attempt(get_change(cs, :merge_cron), get_field(cs, :merge_attempt_at)) do
      {:ok, changes} -> Enum.reduce(changes, cs, fn {k, v}, cs -> put_change(cs, k, v) end)
      {:error, err} -> add_error(cs, :merge_cron, "Failed to generate next run date: #{inspect(err)}")
    end
  end

  defp get_next_attempt(nil, _), do: {:ok, %{}}
  defp get_next_attempt(crontab, last_run) when is_binary(crontab) do
    with {:ok, cron} <- Crontab.CronExpression.Parser.parse(crontab),
         {:ok, ts} <- Crontab.Scheduler.get_next_run_date(cron, Timex.to_naive_datetime(last_run || Timex.now())),
      do: {:ok, %{merge_attempt_at: convert_naive(ts)}}
  end

  defp convert_naive(ndt) do
    DateTime.from_naive!(ndt, "Etc/UTC")
    |> Map.put(:microsecond, {0, 6})
  end
end
