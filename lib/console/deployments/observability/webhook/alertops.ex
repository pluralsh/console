defmodule Console.Deployments.Observability.Webhook.Alertops do
  @behaviour Console.Deployments.Observability.Webhook
  import Console.Deployments.Observability.Webhook.Base

  # AlertOps Outbound Integrations send a fully user-configurable JSON body.
  # We key off the "Standard Alert" template fields (IncidentId, IncidentSubject,
  # IncidentStatus, IncidentSeverity, IncidentURL, IncidentShortText,
  # IncidentLongText) and look for plural association keys (plrl_project,
  # plrl_cluster, plrl_service) at the top level of the payload.  The Raw
  # fallback in Console.Deployments.Observability.Webhook still scrapes
  # markers like `plrl-cluster-foo` out of the title/message.

  def associations(:project, %{"plrl_project" => name}, acc),
    do: Map.put(acc, :project_id, project(name))
  def associations(:cluster, %{"plrl_cluster" => name}, acc),
    do: Map.put(acc, :cluster_id, cluster(name))
  def associations(:service, %{"plrl_service" => name}, %{cluster_id: id} = acc) when is_binary(id),
    do: Map.put(acc, :service_id, service(id, name))
  def associations(_, _, acc), do: acc

  def state(%{"IncidentStatus" => status}) when is_binary(status) do
    case String.upcase(status) do
      "OK" -> :resolved
      "CLOSED" -> :resolved
      "CLOSE" -> :resolved
      "RESOLVED" -> :resolved
      _ -> :firing
    end
  end
  def state(_), do: :firing

  def severity(%{"IncidentSeverity" => sev}) when is_binary(sev) do
    case String.upcase(sev) do
      "CRITICAL" -> :critical
      "SEV1" -> :critical
      "MAJOR" -> :high
      "HIGH" -> :high
      "SEV2" -> :high
      "WARNING" -> :medium
      "MEDIUM" -> :medium
      "SEV3" -> :medium
      "MINOR" -> :low
      "LOW" -> :low
      "INFO" -> :low
      "SEV4" -> :low
      "SEV5" -> :low
      _ -> :undefined
    end
  end
  def severity(_), do: :undefined

  def summary(%{"IncidentLongText" => text}) when is_binary(text) and byte_size(text) > 0,
    do: "Alert Summary: #{text}\n"
  def summary(%{"IncidentShortText" => text}) when is_binary(text) and byte_size(text) > 0,
    do: "Alert Summary: #{text}\n"
  def summary(%{"IncidentSubject" => text}) when is_binary(text) and byte_size(text) > 0,
    do: "Alert Summary: #{text}\n"
  def summary(_), do: "No summary available\n"
end
