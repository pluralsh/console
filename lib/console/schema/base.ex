defmodule Console.Schema.Base do
  import Ecto.Changeset
  @moduledoc false

  defmacro __using__(_) do
    quote do
      use Piazza.Ecto.Schema
      import Console.Schema.Base

      def with_lock(query \\ __MODULE__) do
        from(q in query, lock: "FOR UPDATE")
      end

      def with_limit(query \\ __MODULE__, limit) do
        from(q in query, limit: ^limit)
      end
    end
  end

  def determine_next_run(cs, field \\ :crontab) do
    with {crontab, run} when is_binary(crontab) and is_struct(run) <- crontab_changed(cs, field),
         {:ok, cron} <- Crontab.CronExpression.Parser.parse(crontab),
         {:ok, next} <- Crontab.Scheduler.get_next_run_date(cron, Timex.to_naive_datetime(run)) do
      put_change(cs, :next_run_at, next_run(next))
    else
      {:error, _} = err ->
        add_error(cs, :crontab, "Failed to generate next run date: #{inspect(err)}")
      _ -> cs
    end
  end

  defp crontab_changed(cs, field) do
    case get_change(cs, field) || get_change(cs, :last_run_at) do
      nil -> :ignore
      _ -> {get_field(cs, field), get_field(cs, :last_run_at) || Timex.now()}
    end
  end

  def validate_crontab(field, crontab) when is_binary(crontab) do
    case Crontab.CronExpression.Parser.parse(crontab) do
      {:ok, _} -> []
      {:error, err} -> [{field, "invalid cron expression: #{inspect(err)}"}]
    end
  end
  def validate_crontab(_, _), do: []

  defp next_run(ndt) do
    DateTime.from_naive!(ndt, "Etc/UTC")
    |> Map.put(:microsecond, {0, 6})
    |> Timex.shift(seconds: :rand.uniform(60))
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

  def duration_seconds(cs, field) do
    case duration_value(cs, field) do
      val when is_binary(val) ->
        case parse_duration(val) do
          {:ok, duration} -> put_change(cs, field, seconds(duration))
          {:error, _} -> add_error(cs, field, "invalid duration")
        end
      val when is_integer(val) ->
        put_change(cs, field, val)
      _ -> cs
    end
  end

  defp duration_value(cs, field) do
    get_change(cs, field) || duration_param(cs, field)
  end

  defp duration_param(%{params: params}, field) when is_map(params),
    do: Map.get(params, Atom.to_string(field)) || Map.get(params, field)
  defp duration_param(_, _), do: nil

  def helm_url(cs, field) do
    validate_change(cs, field, fn
      ^field, "http" <> _ -> []
      ^field, "oci" <> _ -> []
      _, _ -> [{field, "invalid helm url, must have a scheme of http://, https:// or oci://"}]
    end)
  end


  def kubernetes_duration(cs, field) do
    validate_format(cs, field, ~r/^\d+[mhsd]/, message: "invalid kubernetes duration")
  end

  def jitter(%Duration{} = duration) do
    Console.jitter(floor(seconds(duration) / 2))
  end

  def truncate_fields(cs, fields, len \\ 255) do
    Enum.reduce(fields, cs, fn field, cs ->
      case get_change(cs, field) do
        v when is_binary(v) -> put_change(cs, field, Console.truncate(v, len))
        _ -> cs
      end
    end)
  end

  def trim_changes(cs, fields) do
    Enum.reduce(fields, cs, &update_change(&2, &1, fn
      value when is_binary(value) -> String.trim(value)
      value -> value
    end))
  end

  def sanitize_text(cs, fields) do
    Enum.reduce(fields, cs, fn field, cs ->
      update_change(cs, field, fn value -> sanitize_text_value(value) end)
    end)
  end

  defp sanitize_text_value(value) when is_binary(value) do
    value
    |> String.replace_invalid("�")
    |> String.replace(<<0>>, "")
  end

  defp sanitize_text_value(value) when is_map(value) do
    Map.new(value, fn {key, value} ->
      {sanitize_text_value(key), sanitize_text_value(value)}
    end)
  end

  defp sanitize_text_value(value) when is_list(value), do: Enum.map(value, &sanitize_text_value/1)
  defp sanitize_text_value(value), do: value

  def seconds(%Duration{week: w, day: d, hour: h, minute: m, second: s}),
    do: (w * 7 + d) * 86_400 + h * 3_600 + m * 60 + s

  def parse_duration("P" <> _ = duration), do: Duration.from_iso8601(duration)
  def parse_duration(duration) when is_binary(duration) do
    duration
    |> String.upcase()
    |> to_iso8601_duration()
    |> Duration.from_iso8601()
  end

  defp to_iso8601_duration(duration) do
    case String.split(duration, "D", parts: 2) do
      [days, ""] when days != "" -> "P#{days}D"
      [days, rest] when days != "" and rest != "" -> "P#{days}DT#{rest}"
      _ -> "PT#{duration}"
    end
  end

  def normalize_period(period) when period in ~w(day week month), do: period
  def normalize_period(period) when period in ~w(day week month)a, do: Atom.to_string(period)

  def normalize_period(period),
    do: raise(ArgumentError, "invalid period #{inspect(period)}; expected day, week, or month")

  def lookback_window("day"), do: {14, "day"}
  def lookback_window("week"), do: {2, "month"}
  def lookback_window("month"), do: {6, "month"}
end
