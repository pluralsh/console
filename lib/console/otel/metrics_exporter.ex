defmodule Console.Otel.MetricsExporter do
  @moduledoc """
  GenServer for exporting cluster and service metrics to an OpenTelemetry collector.
  Manages its own scheduling based on the crontab configured in DeploymentSettings.
  Only runs on the leader node determined by Console.ClusterRing.
  """
  use GenServer
  alias Console.Repo
  alias Console.Deployments.Settings
  alias Console.Otel.{Exporter, MetricsBuilder}
  require Logger

  defmodule State do
    defstruct [:last_run_at, :timer_ref]
  end

  @check_interval :timer.seconds(30)
  @chunk_size 100

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    if Console.conf(:initialize) do
      send(self(), :check)
      :timer.send_interval(@check_interval, :check)
    end
    {:ok, %State{}}
  end

  def handle_info(:check, state) do
    case {leader?(), get_config()} do
      {true, {:ok, config}} ->
        {:noreply, maybe_schedule(state, config)}

      _ ->
        {:noreply, cancel_timer(state)}
    end
  end

  def handle_info(:export, state) do
    case get_config() do
      {:ok, %{endpoint: endpoint}} ->
        do_export(endpoint)
        {:noreply, %{state | last_run_at: DateTime.utc_now(), timer_ref: nil}}

      _ ->
        {:noreply, %{state | timer_ref: nil}}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  defp get_config do
    case Settings.fetch() do
      %{metrics: %{enabled: true, endpoint: endpoint, crontab: crontab}}
          when is_binary(endpoint) and is_binary(crontab) ->
        {:ok, %{endpoint: endpoint, crontab: crontab}}

      _ ->
        :disabled
    end
  end

  defp maybe_schedule(%State{timer_ref: ref} = state, %{crontab: _}) when not is_nil(ref) do
    state
  end

  defp maybe_schedule(%State{last_run_at: last} = state, %{crontab: crontab}) do
    case next_run_time(crontab, last) do
      {:ok, next_at} ->
        delay = max(0, DateTime.diff(next_at, DateTime.utc_now(), :millisecond))
        Logger.info("Scheduling metrics export in #{delay}ms (at #{next_at})")
        ref = Process.send_after(self(), :export, delay)
        %{state | timer_ref: ref}

      :error -> state
    end
  end

  defp next_run_time(crontab, last_run_at) do
    base_time =
      (last_run_at || DateTime.utc_now())
      |> DateTime.to_naive()
      |> NaiveDateTime.add(60, :second)

    with {:ok, expr} <- Crontab.CronExpression.Parser.parse(crontab),
         {:ok, next} <- Crontab.Scheduler.get_next_run_date(expr, base_time) do
      {:ok, DateTime.from_naive!(next, "Etc/UTC")}
    else
      {:error, reason} ->
        Logger.warning("Invalid crontab expression for metrics export: #{inspect(reason)}")
        :error
    end
  end

  defp cancel_timer(%State{timer_ref: nil} = state), do: state
  defp cancel_timer(%State{timer_ref: ref} = state) do
    Process.cancel_timer(ref)
    %{state | timer_ref: nil}
  end

  defp do_export(endpoint) do
    timestamp = DateTime.utc_now()

    []
    |> Stream.concat(MetricsBuilder.service_metrics_stream(timestamp))
    |> Stream.concat(MetricsBuilder.cluster_metrics_stream(timestamp))
    |> Stream.chunk_every(@chunk_size)
    |> Enum.reduce(0, fn chunk, count ->
      case Exporter.export(endpoint, chunk) do
        :ok ->
          count + length(chunk)

        {:error, reason} ->
          Logger.error("Failed to export chunk: #{inspect(reason)}")
          count
      end
    end)
    |> then(&Logger.info("Exported #{&1} metrics to #{endpoint}"))
  end

  defp leader?(), do: Console.ClusterRing.node(:otel_metrics) == node()
end
