defmodule Console.Deployments.Observability.Webhook.Pagerduty do
  @behaviour Console.Deployments.Observability.Webhook
  import Console.Deployments.Observability.Webhook.Base

  def associations(:project, %{"event" => %{"data" => %{"custom_details" => %{"plrl_project" => name}}}}, acc),
    do: Map.put(acc, :project_id, project(name))
  def associations(:cluster, %{"event" => %{"data" => %{"custom_details" => %{"plrl_cluster" => name}}}}, acc),
    do: Map.put(acc, :cluster_id, cluster(name))
  def associations(:service, %{"event" => %{"data" => %{"custom_details" => %{"plrl_service" => name}}}}, %{cluster_id: id} = acc) when is_binary(id),
    do: Map.put(acc, :service_id, service(id, name))
  def associations(_, _, acc), do: acc

  def state(%{"event" => %{"data" => %{"status" => "resolved"}}}), do: :resolved
  def state(_), do: :firing

  def severity(%{"event" => %{"data" => %{"priority" => %{"summary" => priority}}}}) do
    case priority do
      "P1" -> :critical
      "P2" -> :high
      "P3" -> :medium
      "P4" -> :medium
      "P5" -> :low
      _ -> :undefined
    end
  end
  def severity(_), do: :undefined

  def summary(%{"event" => %{"data" => %{"summary" => summary}}}), do: "Alert Summary: #{summary}\n"
  def summary(_), do: "No summary available"
end
