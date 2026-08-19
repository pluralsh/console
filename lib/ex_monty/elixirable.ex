defmodule ExMonty.Elixirable do
  @moduledoc """
  Converts values returned by `ExMonty` into conventional Elixir values.

  Values without a standard Elixir equivalent, such as timedeltas, timezones,
  and file handles, retain their `ExMonty` tag.
  """

  @doc """
  Recursively converts an `ExMonty` result to its Elixir representation.
  """
  defimpl Jason.Encoder, for: MapSet do
    def encode(value, opts) do
      value
      |> MapSet.to_list()
      |> Jason.Encode.list(opts)
    end
  end

  @spec to_elixir(term()) :: term()
  def to_elixir({:bytes, value}) when is_binary(value), do: value
  def to_elixir({:path, value}) when is_binary(value), do: value

  def to_elixir({:date, %{year: year, month: month, day: day}}) do
    Date.new!(year, month, day)
  end

  def to_elixir({:datetime, fields}) when is_map(fields), do: datetime(fields)

  def to_elixir({:named_tuple, _name, fields}) when is_list(fields) do
    Map.new(fields, fn {field, value} -> {field, to_elixir(value)} end)
  end

  def to_elixir({tag, fields})
      when tag in [:timedelta, :timezone, :file_handle] and is_map(fields) do
    {tag, convert_map(fields)}
  end

  def to_elixir({tag, value}) when tag in [:repr, :function] do
    {tag, to_elixir(value)}
  end

  def to_elixir({tag, first, second}) when tag in [:function, :__bigint__] do
    {tag, to_elixir(first), to_elixir(second)}
  end

  def to_elixir(value) when is_list(value), do: Enum.map(value, &to_elixir/1)

  def to_elixir(value) when is_tuple(value) do
    value
    |> Tuple.to_list()
    |> Enum.map(&to_elixir/1)
  end

  def to_elixir(%MapSet{} = value), do: MapSet.new(value, &to_elixir/1)

  def to_elixir(%ExMonty.Dataclass{fields: fields} = value),
    do: %{value | fields: convert_map(fields)}

  def to_elixir(value) when is_map(value), do: convert_map(value)
  def to_elixir(value), do: value

  defp datetime(%{
         year: year,
         month: month,
         day: day,
         hour: hour,
         minute: minute,
         second: second,
         microsecond: microsecond,
         offset_seconds: nil
       }) do
    NaiveDateTime.new!(year, month, day, hour, minute, second, microsecond)
  end

  defp datetime(
         %{
           year: year,
           month: month,
           day: day,
           hour: hour,
           minute: minute,
           second: second,
           microsecond: microsecond,
           offset_seconds: offset_seconds
         } = fields
       ) do
    naive = NaiveDateTime.new!(year, month, day, hour, minute, second, microsecond)
    zone = Map.get(fields, :tz_name) || fixed_offset_zone(offset_seconds)

    %DateTime{
      year: naive.year,
      month: naive.month,
      day: naive.day,
      hour: naive.hour,
      minute: naive.minute,
      second: naive.second,
      microsecond: naive.microsecond,
      time_zone: zone,
      zone_abbr: zone,
      utc_offset: offset_seconds,
      std_offset: 0,
      calendar: Calendar.ISO
    }
  end

  defp convert_map(value) do
    Map.new(value, fn {key, item} -> {to_elixir(key), to_elixir(item)} end)
  end

  defp fixed_offset_zone(offset_seconds) do
    sign = if offset_seconds < 0, do: "-", else: "+"
    offset_seconds = abs(offset_seconds)
    hours = div(offset_seconds, 3600)
    minutes = offset_seconds |> rem(3600) |> div(60)

    "UTC#{sign}#{String.pad_leading(to_string(hours), 2, "0")}:#{String.pad_leading(to_string(minutes), 2, "0")}"
  end
end
