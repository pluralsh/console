defmodule Console.Deployments.Observability.Webhook do
  @moduledoc """
  Parses incoming webhook data into a format accessible to our db, delegates to a number of behaviour implementations
  to handle provider-specific logic.
  """
  import Console.Services.Base, only: [ok: 1]
  alias Console.Deployments.Observability.Webhook.{Grafana, Raw}
  alias Console.Schema.ObservabilityWebhook

  @callback associations(atom, map, map) :: map
  @callback state(binary) :: :firing | :resolved
  @callback severity(map) :: :low | :medium | :high | :critical | :undefined
  @callback summary(map) :: binary

  def payload(%ObservabilityWebhook{type: :grafana}, %{"alerts" => [_ | _] = alerts} = payload) do
    Enum.map(alerts, fn alert ->
      alert =
        Map.put(alert, "labels", Map.merge(alert["labels"] || %{}, payload["commonLabels"] || %{}))
        |> Map.put("annotations", Map.merge(alert["annotations"] || %{}, payload["commonAnnotations"] || %{}))

      Map.merge(%{
        type: :grafana,
        fingerprint: alert["fingerprint"],
        annotations: alert["annotations"],
        state: Grafana.state(alert["status"]),
        severity: Grafana.severity(alert),
        url: alert["generatorURL"],
        title: payload["title"],
        message: "#{Grafana.summary(alert)}#{payload["message"]}",
        tags: tags(alert["labels"]),
      }, add_associations(Grafana, alert))
      |> backfill_raw()
    end)
    |> ok()
  end

  def payload(_, _), do: {:error, "invalid payload"}

  defp add_associations(impl, data) do
    Enum.reduce(~w(project cluster service)a, %{}, &impl.associations(&1, data, &2))
  end

  defp backfill_raw(%{title: title, message: msg} = attrs) do
    txt = "#{title}\n#{msg}"
    Enum.reduce(~w(project cluster service)a, attrs, fn scope, acc ->
      case Map.get(acc, :"#{scope}_id") do
        id when is_binary(id) -> acc
        _ -> Raw.associations(scope, txt, acc)
      end
    end)
  end

  defp tags(map) do
    Enum.filter(map, fn
      {k, v} when is_binary(k) and is_binary(v) -> true
      _ -> false
    end)
    |> Enum.map(fn {k, v} -> %{name: k, value: v} end)
  end
end
