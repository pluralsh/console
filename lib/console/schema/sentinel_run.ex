defmodule Console.Schema.SentinelRun do
  use Console.Schema.Base
  alias Console.Schema.Sentinel

  defenum Status, pending: 0, success: 1, failed: 2

  schema "sentinel_runs" do
    field :status, Status, default: :pending
    field :polled_at, :utc_datetime_usec

    embeds_many :results, SentinelCheckResult, on_replace: :delete do
      field :name,   :string
      field :status, Status, default: :pending
      field :reason, :string
    end

    belongs_to :sentinel, Sentinel

    timestamps()
  end

  def unpolled(query \\ __MODULE__) do
    from(s in query, where: is_nil(s.polled_at))
  end

  def for_sentinel(query \\ __MODULE__, sentinel_id) do
    from(s in query, where: s.sentinel_id == ^sentinel_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(s in query, order_by: ^order)
  end

  @valid ~w(status sentinel_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:results, with: &result_changeset/2)
    |> validate_required(~w(status)a)
  end

  defp result_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name status reason)a)
    |> validate_required(~w(name status)a)
  end
end
