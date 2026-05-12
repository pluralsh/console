defmodule Console.Pipelines.Monitor.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Deployments.Observability
  require Logger

  def handle_event(monitor) do
    Logger.info "handling monitor #{monitor.id}"
    with {:ok, monitor} <- Observability.mark_run(monitor) do
      case Observability.run_monitor(monitor) do
        {:ok, alert} -> Logger.info("monitor #{monitor.id} alert #{alert.id} modified to #{alert.state}")
        :ignore -> :ok
        err -> Logger.error("monitor #{monitor.id} run failed: #{inspect(err)}")
      end
    end
  end
end
