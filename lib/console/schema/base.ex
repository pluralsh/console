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

  def determine_next_run(cs) do
    with crontab when is_binary(crontab) <- get_field(cs, :crontab),
         run when not is_nil(run) <- get_change(cs, :last_run_at),
         {:ok, cron} <- Crontab.CronExpression.Parser.parse(crontab),
         {:ok, next} <- Crontab.Scheduler.get_next_run_date(cron, Timex.to_naive_datetime(run)) do
      put_change(cs, :next_run_at, next_run(next))
    else
      {:error, _} = err ->
        add_error(cs, :crontab, "Failed to generate next run date: #{inspect(err)}")
      _ -> cs
    end
  end

  defp next_run(ndt) do
    DateTime.from_naive!(ndt, "Etc/UTC")
    |> Map.put(:microsecond, {0, 6})
    |> Timex.shift(seconds: Console.jitter(60))
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

  def seconds(%Duration{hour: h, minute: m, second: s}), do: h * 3600 + m * 60 + s

  def parse_duration("P" <> _ = duration), do: Duration.from_iso8601(duration)
  def parse_duration(duration), do: Duration.from_iso8601(String.upcase("PT#{duration}"))
end
