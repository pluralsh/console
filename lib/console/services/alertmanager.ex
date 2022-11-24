defmodule Console.Services.Alertmanager do
  use Console.Services.Base
  alias Console.PubSub
  alias Console.Schema.{AlertmanagerIncident, Notification}
  alias Alertmanager.Alert

  @sinks [
    Console.Alertmanager.Notification,
    Console.Alertmanager.Incidents
  ]

  def get_notification(fingerprint),
    do: Console.Repo.get_by(Notification, fingerprint: fingerprint)

  def get_mapping(fingerprint), do: Console.Repo.get_by(AlertmanagerIncident, fingerprint: fingerprint)

  def handle_alert(%Alert{labels: %{"alertname" => "Watchdog"}}), do: :ok
  def handle_alert(%Alert{} = alert) do
    Enum.reduce_while(@sinks, %{}, fn sink, acc ->
      case sink.handle_alert(alert) do
        {:error, err} -> {:halt, err}
        {:ok, res} -> {:cont, Map.put(acc, sink.name(), res)}
        :ok -> {:cont, acc}
      end
    end)
  end

  def create_notification(_, %Alert{labels: %{"alertname" => "Watchdog"}}), do: :ok
  def create_notification(repo, %Alert{fingerprint: fp} = alert) do
    case get_notification(fp) do
      %Notification{} = notif -> notif
      nil -> %Notification{fingerprint: fp}
    end
    |> Notification.changeset(%{
      title: alert.summary,
      description: "[[#{alert.status}]] #{alert.description || ""}",
      labels: alert.labels,
      annotations: alert.annotations,
      repository: repo,
      status: alert.status,
      severity: Map.get(alert.labels || %{}, "severity", :none),
      seen_at: Timex.now()
    })
    |> Console.Repo.insert_or_update()
    |> notify(:create)
  end

  def create_notification(attrs) do
    %Notification{fingerprint: Console.rand_str()}
    |> Notification.changeset(attrs)
    |> Console.Repo.insert()
    |> notify(:create)
  end

  def test_notification() do
    create_notification(%{
      title: "test notification",
      description: "a simple test notification",
      labels: %{"test" => "label"},
      annotations: %{"test" => "annotation"},
      repository: "console",
      severity: 1,
      seen_at: Timex.now()
    })
  end

  defp notify({:ok, %Notification{} = notif}, :create),
    do: handle_notify(PubSub.NotificationCreated, notif)
  defp notify(pass, _), do: pass
end
