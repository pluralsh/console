defmodule Console.Deployments.Observability.Webhook do
  @moduledoc """
  Parses incoming webhook data into a format accessible to our db, delegates to a number of behaviour implementations
  to handle provider-specific logic.
  """
  import Console.Services.Base, only: [ok: 1]
  alias Console.Deployments.Observability.Webhook.{Grafana, Datadog, Pagerduty, Newrelic, Raw}
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
        title: Grafana.title(payload, alert),
        message: "#{Grafana.summary(alert)}#{payload["message"] || ""}",
        tags: tags(alert["labels"]),
      }, add_associations(Grafana, alert))
      |> backfill_raw()
    end)
    |> ok()
  end

  def payload(%ObservabilityWebhook{type: :pagerduty}, %{"event" => event = %{"data" => data}} = payload) do
    # Create structured alert
    # Note that pagerduty doesn't have annotations like grafana does, so just use an empty map
    # Also, pagerduty has a single event per payload, so unlike grafana we don't iterate over messages
    Map.merge(%{
      type: :pagerduty,
      fingerprint: event["id"],
      annotations: %{},
      state: Pagerduty.state(payload),
      severity: Pagerduty.severity(payload),
      url: data["html_url"] || "[NO_URL]",
      title: data["title"] || "[NO_TITLE]",
      message: Pagerduty.summary(payload),
      tags: tags(data["custom_details"] || %{}),
    }, add_associations(Pagerduty, payload))
    |> backfill_raw()
    |> listify()
    |> ok()
  end

  def payload(%ObservabilityWebhook{type: :datadog}, payload) do
    Map.merge(%{
      type: :datadog,
      fingerprint: Map.get(payload, "id"),
      annotations: Map.get(payload, "meta") || %{},
      state: Datadog.state(
        Map.get(payload, "status") ||
        Map.get(payload, "alert_transition") ||
        ""
      ),
      severity: Datadog.severity(payload),
      url: Map.get(payload, "link") || Map.get(payload, "url") || "",
      title: Map.get(payload, "title") || "Datadog Alert",
      message: Datadog.summary(payload),
      tags: tags(Datadog.datadog_tag_map(payload)),
    }, add_associations(Datadog, payload))
    |> backfill_raw()
    |> listify()
    |> ok()
  end

  def payload(%ObservabilityWebhook{type: :newrelic}, payload) do
    Map.merge(%{
      type: :newrelic,
      fingerprint: Map.get(payload, "id") || "[NO_ID]",
      annotations: %{},
      state: Newrelic.state(payload),
      severity: Newrelic.severity(payload),
      url: Map.get(payload, "issueUrl") || "[NO_URL]",
      title: Map.get(payload, "title") || "[NO_TITLE]",
      message: Newrelic.summary(payload),
      tags: %{},
    }, add_associations(Newrelic, payload))
    |> backfill_raw()
    |> listify()
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

  defp listify(l) when is_list(l), do: l
  defp listify(v), do: [v]
end
