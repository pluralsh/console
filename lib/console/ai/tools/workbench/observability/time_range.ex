defmodule Console.AI.Tools.Workbench.Observability.TimeRange do
  use Console.Schema.Base
  alias Toolquery.TimeRange

  embedded_schema do
    field :start, :utc_datetime_usec
    field :end,   :utc_datetime_usec
  end

  @valid ~w(start end)a
  @default_lookback_minutes 60

  def default(past \\ @default_lookback_minutes) do
    now = Timex.now()

    %__MODULE__{
      start: Timex.shift(now, minutes: -past),
      end: now,
    }
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:start, fn -> Timex.now() |> Timex.shift(minutes: -@default_lookback_minutes) end)
    |> put_new_change(:end, fn -> Timex.now() end)
  end

  def put_default(changeset) do
    case get_field(changeset, :time_range) do
      nil -> put_embed(changeset, :time_range, default())
      _ -> changeset
    end
  end

  def ensure(%{time_range: nil} = tool), do: Map.put(tool, :time_range, default())
  def ensure(tool), do: tool

  def safe(%__MODULE__{start: s_ts, end: e_ts}, days \\ 7) do
    case Timex.diff(e_ts, s_ts, :days) < days do
      true -> :ok
      _ -> {:error, "The time range is greater than the maximum allowed of #{days} days"}
    end
  end

  def to_proto(%__MODULE__{start: start_ts, end: end_ts}) do
    %TimeRange{
      start: to_proto_timestamp(start_ts),
      end: to_proto_timestamp(end_ts),
    }
  end
  def to_proto(_), do: nil

  def to_datetime(%Google.Protobuf.Timestamp{} = timestamp),
    do: Google.Protobuf.to_datetime(timestamp)
  def to_datetime(_), do: nil

  defp to_proto_timestamp(%DateTime{} = datetime),
    do: Google.Protobuf.from_datetime(datetime)
  defp to_proto_timestamp(_), do: nil
end
