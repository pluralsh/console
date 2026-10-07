defmodule Console.Deployments.Observability.Webhook.Grafana do
  @behaviour Console.Deployments.Observability.Webhook
  import Console.Deployments.Observability.Webhook.Base

  def associations(:project, %{"labels" => %{"plrl_project" => name}}, acc),
    do: Map.put(acc, :project_id, project(name))
  def associations(:cluster, %{"labels" => %{"plrl_cluster" => name}}, acc),
    do: Map.put(acc, :cluster_id, cluster(name))
  def associations(:service, %{"labels" => %{"plrl_service" => name}}, %{cluster_id: id} = acc) when is_binary(id),
    do: Map.put(acc, :service_id, service(id, name))
  def associations(_, _, acc), do: acc

  def state("firing"), do: :firing
  def state(_), do: :resolved

  def severity(%{"annotations" => %{"severity" => "low"}}), do: :low
  def severity(%{"annotations" => %{"severity" => "medium"}}), do: :medium
  def severity(%{"annotations" => %{"severity" => "high"}}), do: :high
  def severity(%{"annotations" => %{"severity" => "critical"}}), do: :critical
  def severity(_), do: :undefined

  def summary(%{"annotations" => %{"summary" => summary}}), do: "Alert Summary: #{summary}\n"
  def summary(_), do: ""

  # this alert's entry in its stored webhook body, matched by fingerprint, since grafana sends a group of alerts per body
  defp entry(%{payload: %{"alerts" => [_ | _] = alerts}, fingerprint: fp}) when is_binary(fp),
    do: Enum.find(alerts, &(is_map(&1) && &1["fingerprint"] == fp))
  defp entry(_), do: nil

  @doc """
  The evaluated query values, e.g. "A=1018071, B=1", falling back to grafana's verbose value string.
  """
  def value(alert) do
    case entry(alert) do
      %{"values" => %{} = values} when map_size(values) > 0 ->
        values
        |> Enum.sort_by(&elem(&1, 0))
        |> Enum.map_join(", ", fn {var, v} -> "#{var}=#{format_value(v)}" end)
      %{"valueString" => v} when is_binary(v) and byte_size(v) > 0 -> v
      _ -> nil
    end
  end

  def silence_url(alert) do
    case entry(alert) do
      %{"silenceURL" => url} when is_binary(url) and byte_size(url) > 0 -> url
      _ -> nil
    end
  end

  defp format_value(v) when is_float(v) and v == trunc(v), do: Integer.to_string(trunc(v))
  defp format_value(v) when is_float(v), do: Float.to_string(v)
  defp format_value(v) when is_map(v) or is_list(v), do: Jason.encode!(v)
  defp format_value(v), do: to_string(v)

  def title(%{"title" => title}, _) when is_binary(title), do: title
  def title(_, %{"labels" => %{"alertname" => title}}) when is_binary(title), do: title
  def title(_, _), do: "Alertmanager Alert"
end
