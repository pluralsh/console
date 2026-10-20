defmodule Console.Logs.Time do
  @type t :: %__MODULE__{}
  defstruct [:after, :before, :duration, :reverse]

  def new(%__MODULE__{} = time), do: time
  def new(%{} = args), do: struct(__MODULE__,  args)
  def new(args) when is_list(args), do: struct(__MODULE__,  args)
  def new(_), do: nil

  @default_lookback Timex.Duration.from_hours(1)

  def safe_duration(%{} = duration), do: duration
  def safe_duration(duration) when is_binary(duration) do
    case Console.convert_duration(duration) do
      {:ok, duration} -> duration
      {:error, _} -> Timex.Duration.parse!(String.upcase(duration))
    end
  end

  @doc """
  Resolves a time spec into a concrete `{start, stop}` datetime window, falling back to
  `default` as the lookback when no duration is given and the range isn't fully bounded
  """
  @spec range(t | nil, Timex.Duration.t) :: {DateTime.t, DateTime.t}
  def range(time, default \\ @default_lookback)
  def range(%__MODULE__{after: aft, before: bef}, _) when not is_nil(aft) and not is_nil(bef),
    do: {to_datetime(aft), to_datetime(bef)}
  def range(%__MODULE__{after: aft, duration: dur}, _) when not is_nil(aft) do
    start = to_datetime(aft)
    {start, (if dur, do: Timex.add(start, safe_duration(dur)), else: Timex.now())}
  end
  def range(%__MODULE__{before: bef, duration: dur}, default) when not is_nil(bef) do
    stop = to_datetime(bef)
    {Timex.subtract(stop, lookback(dur, default)), stop}
  end
  def range(%__MODULE__{duration: dur}, default) do
    stop = Timex.now()
    {Timex.subtract(stop, lookback(dur, default)), stop}
  end
  def range(_, default), do: range(%__MODULE__{}, default)

  @spec to_datetime(DateTime.t | NaiveDateTime.t | binary) :: DateTime.t
  def to_datetime(%DateTime{} = dt), do: dt
  def to_datetime(%NaiveDateTime{} = dt), do: DateTime.from_naive!(dt, "Etc/UTC")
  def to_datetime(ts) when is_binary(ts), do: Timex.parse!(ts, "{ISO:Extended}") |> to_datetime()

  @spec to_unix_nano(DateTime.t | NaiveDateTime.t | binary) :: integer
  def to_unix_nano(ts), do: ts |> to_datetime() |> DateTime.to_unix(:nanosecond)

  @spec from_unix_nano(integer | binary) :: DateTime.t
  def from_unix_nano(ts) when is_binary(ts), do: ts |> String.to_integer() |> from_unix_nano()
  def from_unix_nano(ts) when is_integer(ts), do: DateTime.from_unix!(ts, :nanosecond)

  @doc """
  Converts a duration string (eg 5m, 1h) into whole seconds (minimum 1), or `default` if it can't be parsed
  """
  @spec to_seconds(binary | nil, integer) :: integer
  def to_seconds(dur, default) when is_binary(dur) do
    case Console.convert_duration(dur) do
      {:ok, dur} -> max(Timex.Duration.to_seconds(dur, truncate: true), 1)
      _ -> default
    end
  end
  def to_seconds(_, default), do: default

  defp lookback(nil, default), do: default
  defp lookback(dur, _), do: safe_duration(dur)
end
