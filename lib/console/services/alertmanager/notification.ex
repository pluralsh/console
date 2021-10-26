defmodule Console.Alertmanager.Notification do
  use Console.Services.Base
  alias Console.Services.Alertmanager, as: Svc
  alias Console.Schema.Notification
  alias Alertmanager.Alert

  def name(), do: :notification

  def handle_alert(%Alert{labels: %{"namespace" => ns}} = alert) do
    repo = Console.from_namespace(ns)

    Svc.create_notification(repo, alert)
  end
end
