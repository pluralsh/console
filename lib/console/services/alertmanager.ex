defmodule Console.Services.Alertmanager do
  use Console.Services.Base
  alias Console.Schema.{AlertmanagerIncident, Notification}
  alias Alertmanager.Alert

  @sinks [
    Console.Alertmanager.Notification,
    Console.Alertmanager.Incidents
  ]

  def get_notification(fingerprint),
    do: Console.Repo.get_by(Notification, fingerprint: fingerprint)

  def get_mapping(fingerprint), do: Console.Repo.get_by(AlertmanagerIncident, fingerprint: fingerprint)

  def handle_alert(%Alert{} = alert) do
    Enum.reduce_while(@sinks, %{}, fn sink, acc ->
      case sink.handle_alert(alert) do
        {:error, err} -> {:halt, err}
        {:ok, res} -> {:cont, Map.put(acc, sink.name(), res)}
        :ok -> {:cont, acc}
      end
    end)
  end
end
