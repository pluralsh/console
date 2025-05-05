defmodule Console.Deployments.Observability.Webhook.Newrelic do
  @behaviour Console.Deployments.Observability.Webhook
  import Console.Deployments.Observability.Webhook.Base

  def associations(:project, payload, acc) do
    Map.put(acc, :project_id, extract_from_payload(payload, ~r/plrl_project:\s*([^,\s]+)/, &project/1))
  end

  def associations(:cluster, payload, acc) do
    Map.put(acc, :cluster_id, extract_from_payload(payload, ~r/plrl_cluster:\s*([^,\s]+)/, &cluster/1))
  end

  def associations(:service, payload, %{cluster_id: id} = acc) when is_binary(id) do
    Map.put(acc, :service_id, extract_from_payload(payload, ~r/plrl_service:\s*([^,\s]+)/, fn value ->
      clean_value = String.replace(value, ~s("), "")
      service(id, clean_value)
    end))
  end

  def associations(_, _, acc), do: acc

  def state(%{"state" => "RESOLVED"}), do: :resolved
  def state(%{"state" => "ACTIVATED"}), do: :firing
  def state(_), do: :unknown

  def severity(%{"priority" => "CRITICAL"}), do: :critical
  def severity(_), do: :medium

  def summary(%{"title" => title, "alertConditionNames" => [_ | _] = conditions}) do
    "Alert Summary: #{title}\n triggered by: #{Enum.join(conditions, ", ")}"
  end

  def summary(%{"message" => message}) do
    "Alert Summary: #{message}"
  end

  def summary(_), do: "No summary available\n"

  defp extract_from_payload(payload, pattern, wrapper) do
    case Regex.run(pattern, Jason.encode!(payload)) do
      [_, value] -> wrapper.(value)
      _ -> nil
    end
  end
end
