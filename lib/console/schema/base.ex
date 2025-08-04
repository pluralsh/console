defmodule Console.Schema.Base do
  import Ecto.Changeset
  @moduledoc false

  defmacro __using__(_) do
    quote do
      use Piazza.Ecto.Schema
      import Console.Schema.Base
    end
  end

  def immutable(cs, fields) do
    Enum.reduce(fields, cs, fn field, cs ->
      case {cs, get_change(cs, field)} do
        {cs, nil} -> cs
        {%Ecto.Changeset{data: %{^field => val}}, _} when not is_nil(val) ->
          add_error(cs, field, "cannot be changed")
        {cs, _} -> cs
      end
    end)
  end

  def duration(cs, field) do
    with val when is_binary(val) <- get_change(cs, field),
         {:ok, _} <- parse_duration(val) do
      cs
    else
      {:error, _} -> add_error(cs, field, "invalid duration")
      _ -> cs
    end
  end

  def jitter(%Duration{hour: h, minute: m, second: s}) do
    seconds = h * 3600 + m * 60 + s
    Console.jitter(floor(seconds / 2))
  end

  def parse_duration("P" <> _ = duration), do: Duration.from_iso8601(duration)
  def parse_duration(duration), do: Duration.from_iso8601(String.upcase("PT#{duration}"))
end
