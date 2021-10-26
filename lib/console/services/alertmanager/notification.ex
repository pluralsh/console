defmodule Console.Alertmanager.Notification do
  use Console.Services.Base
  alias Console.Services.Alertmanager, as: Svc
  alias Console.Schema.Notification
  alias Alertmanager.Alert

  def name(), do: :notification

  def handle_alert(%Alert{labels: %{"namespace" => ns}} = alert) do
    repo = Console.from_namespace(ns)

    Svc.get_notification(alert.fingerprint)
    |> case do
      %Notification{} = notif -> notif
      nil -> %Notification{fingerprint: alert.fingerprint}
    end
    |> Notification.changeset(%{
      title: alert.summary,
      description: "[[#{alert.status}]] #{alert.description || ""}",
      labels: alert.labels,
      annotations: alert.annotations,
      repository: repo,
      severity: Map.get(alert.labels || %{}, "severity", :none),
      seen_at: Timex.now()
    })
    |> Console.Repo.insert_or_update()
  end
end
