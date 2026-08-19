defprotocol ExMonty.Pythonable do
  @moduledoc """
  Converts Elixir values into the representations accepted by `ExMonty`.

  Core collections are converted recursively. Implement this protocol for
  application-specific structs before passing them to a Python sandbox.
  """

  @fallback_to_any true

  @doc "Converts a value into an `ExMonty` Python input."
  @spec to_python(term()) :: term()
  def to_python(value)
end

defimpl ExMonty.Pythonable, for: [Integer, Float, BitString] do
  def to_python(value), do: value
end

defimpl ExMonty.Pythonable, for: Atom do
  def to_python(value)
      when value in [
             nil,
             true,
             false,
             :ellipsis,
             :not_implemented,
             :infinity,
             :neg_infinity,
             :nan
           ],
      do: value

  def to_python(value), do: Atom.to_string(value)
end

defimpl ExMonty.Pythonable, for: List do
  def to_python(values), do: Enum.map(values, &ExMonty.Pythonable.to_python/1)
end

defimpl ExMonty.Pythonable, for: Tuple do
  @map_field_tags [:date, :datetime, :timedelta, :timezone, :file_handle]
  @two_element_tags [:bytes, :path, :repr, :function]
  @three_element_tags [:named_tuple, :function, :__bigint__]

  def to_python({tag, fields}) when tag in @map_field_tags and is_map(fields) do
    {tag, Map.new(fields, fn {key, value} -> {key, ExMonty.Pythonable.to_python(value)} end)}
  end

  def to_python({tag, value}) when tag in @two_element_tags do
    {tag, ExMonty.Pythonable.to_python(value)}
  end

  def to_python({tag, first, second}) when tag in @three_element_tags do
    {tag, ExMonty.Pythonable.to_python(first), ExMonty.Pythonable.to_python(second)}
  end

  def to_python(values) do
    values
    |> Tuple.to_list()
    |> Enum.map(&ExMonty.Pythonable.to_python/1)
    |> List.to_tuple()
  end
end

defimpl ExMonty.Pythonable, for: Map do
  def to_python(values) do
    Map.new(values, fn {key, value} ->
      {ExMonty.Pythonable.to_python(key), ExMonty.Pythonable.to_python(value)}
    end)
  end
end

defimpl ExMonty.Pythonable, for: MapSet do
  def to_python(values), do: MapSet.new(values, &ExMonty.Pythonable.to_python/1)
end

defimpl ExMonty.Pythonable, for: Date do
  def to_python(%Date{year: year, month: month, day: day}) do
    {:date, %{year: year, month: month, day: day}}
  end
end

defimpl ExMonty.Pythonable, for: NaiveDateTime do
  def to_python(%NaiveDateTime{} = datetime) do
    {:datetime,
     %{
       year: datetime.year,
       month: datetime.month,
       day: datetime.day,
       hour: datetime.hour,
       minute: datetime.minute,
       second: datetime.second,
       microsecond: elem(datetime.microsecond, 0),
       offset_seconds: nil,
       tz_name: nil
     }}
  end
end

defimpl ExMonty.Pythonable, for: DateTime do
  def to_python(%DateTime{} = datetime) do
    {:datetime,
     %{
       year: datetime.year,
       month: datetime.month,
       day: datetime.day,
       hour: datetime.hour,
       minute: datetime.minute,
       second: datetime.second,
       microsecond: elem(datetime.microsecond, 0),
       offset_seconds: datetime.utc_offset + datetime.std_offset,
       tz_name: datetime.zone_abbr
     }}
  end
end

defimpl ExMonty.Pythonable, for: ExMonty.Dataclass do
  def to_python(%ExMonty.Dataclass{fields: fields} = dataclass) do
    %{dataclass | fields: ExMonty.Pythonable.to_python(fields)}
  end
end

defimpl ExMonty.Pythonable, for: Any do
  def to_python(value) do
    raise ArgumentError,
          "cannot convert #{inspect(value)} to a Python value; " <>
            "implement ExMonty.Pythonable for #{inspect(value.__struct__)}"
  end
end
