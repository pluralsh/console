defmodule Console.AI.Tools.Workbench.Observability.TimeRange do
  use Console.Schema.Base
  alias Toolquery.TimeRange

  embedded_schema do
    field :start, :utc_datetime_usec
    field :end,   :utc_datetime_usec
  end

  @valid ~w(start end)a

  def default(past \\ 30) do
    %__MODULE__{
      start: Timex.now() |> Timex.shift(minutes: -past),
      end: Timex.now(),
    }
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:start, fn -> Timex.now() |> Timex.shift(minutes: -30) end)
    |> put_new_change(:end, fn -> Timex.now() end)
  end

  def to_proto(%__MODULE__{start: start_ts, end: end_ts}) do
    %TimeRange{
      start: to_proto_timestamp(start_ts),
      end: to_proto_timestamp(end_ts),
    }
  end
  def to_proto(_), do: nil

  defp to_proto_timestamp(%DateTime{} = datetime),
    do: Google.Protobuf.from_datetime(datetime)
  defp to_proto_timestamp(_), do: nil
end
