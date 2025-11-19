defmodule Console.Schema.SentinelRun do
  use Console.Schema.Base
  alias Console.Schema.{
    Sentinel,
    SentinelRunJob,
    PipelineGate
  }

  defenum Status, pending: 0, success: 1, failed: 2

  schema "sentinel_runs" do
    field :status,       Status, default: :pending
    field :polled_at,    :utc_datetime_usec
    field :completed_at, :utc_datetime_usec

    embeds_many :results, SentinelCheckResult, on_replace: :delete do
      field :name,             :string
      field :status,           Status, default: :pending
      field :reason,           :string

      field :job_count,        :integer, default: 0
      field :successful_count, :integer, default: 0
      field :failed_count,     :integer, default: 0
    end

    embeds_many :checks, Sentinel.SentinelCheck, on_replace: :delete

    belongs_to :sentinel, Sentinel
    has_many :jobs, SentinelRunJob, on_delete: :delete_all
    has_one :gate, PipelineGate

    timestamps()
  end

  def unpolled(query \\ __MODULE__) do
    from(s in query, where: is_nil(s.polled_at) and s.status == :pending)
  end

  def for_sentinel(query \\ __MODULE__, sentinel_id) do
    from(s in query, where: s.sentinel_id == ^sentinel_id)
  end

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(days: -14)
    from(s in query, where: s.inserted_at < ^expiry)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(s in query, order_by: ^order)
  end

  @valid ~w(status sentinel_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:results, with: &result_changeset/2)
    |> cast_embed(:checks, with: &Sentinel.check_changeset/2)
    |> validate_required(~w(status)a)
    |> add_completed_at()
  end

  defp result_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name status reason job_count successful_count failed_count)a)
    |> validate_required(~w(name status)a)
  end

  def add_completed_at(cs) do
    case get_change(cs, :status) do
      s when s in ~w(success failed)a -> put_change(cs, :completed_at, DateTime.utc_now())
      _ -> cs
    end
  end
end
