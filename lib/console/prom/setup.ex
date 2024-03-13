defmodule Console.Prom.Setup do
  alias Console.Prom.{Ecto, Metrics}
  alias ConsoleWeb.Plugs.MetricsExporter

  def setup() do
    Ecto.setup()
    Metrics.setup()
    MetricsExporter.setup()
  end

  def attach() do
    :ok = :telemetry.attach(
      "prometheus-ecto",
      [:console, :repo, :query],
      &Ecto.handle_event/4,
      %{}
    )
  end
end
