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

  def title(%{"title" => title}, _) when is_binary(title), do: title
  def title(_, %{"labels" => %{"alertname" => title}}) when is_binary(title), do: title
  def title(_, _), do: "Alertmanager Alert"
end
