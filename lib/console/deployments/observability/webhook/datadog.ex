defmodule Console.Deployments.Observability.Webhook.Datadog do
  @behaviour Console.Deployments.Observability.Webhook
  import Console.Deployments.Observability.Webhook.Base

  # Regular expressions to extract information from unstructured text
  @service_regex [~r/service[:\s]+([^,\n]+)/i, ~r/service_name[:\s]+([^,\n]+)/i]
  @cluster_regex [~r/cluster[:\s]+([^,\n]+)/i, ~r/cluster_name[:\s]+([^,\n]+)/i]
  @project_regex [~r/project[:\s]+([^,\n]+)/i, ~r/namespace[:\s]+([^,\n]+)/i]

  # Basic associations handlers
  def associations(:project, %{"tags" => tags}, acc) when is_list(tags) do
    case find_tag(tags, ["plrl_project", "project", "plural_project"]) do
      {_, val} -> Map.put(acc, :project_id, project(val))
      _ -> acc
    end
  end

  def associations(:project, %{"meta" => %{"project" => project}}, acc) when is_binary(project),
    do: Map.put(acc, :project_id, project(project))

  def associations(:project, %{"project" => project}, acc) when is_binary(project),
    do: Map.put(acc, :project_id, project(project))

  def associations(:cluster, %{"tags" => tags}, acc) when is_list(tags) do
    case find_tag(tags, ["plrl_cluster", "cluster", "plural_cluster"]) do
      {_, val} -> Map.put(acc, :cluster_id, cluster(val))
      _ -> acc
    end
  end

  def associations(:cluster, %{"meta" => %{"cluster" => cluster}}, acc) when is_binary(cluster),
    do: Map.put(acc, :cluster_id, cluster(cluster))

  def associations(:cluster, %{"cluster" => cluster}, acc) when is_binary(cluster),
    do: Map.put(acc, :cluster_id, cluster(cluster))

  def associations(:service, %{"tags" => tags}, %{cluster_id: id} = acc) when is_list(tags) and is_binary(id) do
    case find_tag(tags, ["plrl_service", "service", "plural_service"]) do
      {_, val} -> Map.put(acc, :service_id, service(id, val))
      _ -> acc
    end
  end

  def associations(:service, %{"meta" => %{"service" => service}}, %{cluster_id: id} = acc) when is_binary(service) and is_binary(id),
    do: Map.put(acc, :service_id, service(id, service))

  def associations(:service, %{"service" => service}, %{cluster_id: id} = acc) when is_binary(service) and is_binary(id),
    do: Map.put(acc, :service_id, service(id, service))

  def associations(scope, payload, acc) when is_binary(payload) do
    extract_from_text(scope, payload, acc)
  end

  def associations(scope, payload, acc) when is_map(payload) do
    text = extract_text_from_payload(payload)
    extract_from_text(scope, text, acc)
  end

  def associations(_, _, acc), do: acc

  def state("triggered"), do: :firing
  def state("alert"), do: :firing
  def state("warning"), do: :firing
  def state("error"), do: :firing
  def state("critical"), do: :firing
  def state("alerting"), do: :firing
  def state("trigger"), do: :firing
  def state("firing"), do: :firing

  def state("ok"), do: :resolved
  def state("resolved"), do: :resolved
  def state("recovery"), do: :resolved
  def state("recover"), do: :resolved
  def state("normal"), do: :resolved
  def state(_), do: :resolved

  def severity(%{"priority" => "P1"}), do: :critical
  def severity(%{"priority" => "P2"}), do: :high
  def severity(%{"priority" => "P3"}), do: :medium
  def severity(%{"priority" => "P4"}), do: :low
  def severity(%{"priority" => "P5"}), do: :low

  def severity(%{"alert_type" => "error"}), do: :critical
  def severity(%{"alert_type" => "critical"}), do: :critical
  def severity(%{"alert_type" => "warning"}), do: :medium
  def severity(%{"alert_type" => "info"}), do: :low
  def severity(_), do: :undefined

  def summary(%{"title" => title, "body" => body}) when is_binary(title) and is_binary(body),
    do: "#{title}\n#{body}\n"
  def summary(%{"text_title" => title}) when is_binary(title),
    do: "Alert Summary: #{title}\n"
  def summary(%{"message" => message}) when is_binary(message),
    do: "Alert Summary: #{message}\n"
  def summary(%{"body" => body}) when is_binary(body),
    do: "Alert Summary: #{body}\n"
  def summary(_), do: ""

  # Helper functions

  defp find_tag(tags, possible_keys) do
    Enum.find_value(tags, fn
      {k, v} -> if k in possible_keys, do: {k, v}, else: nil
      tag when is_binary(tag) ->
        case String.split(tag, ":", parts: 2) do
          [k, v] -> if k in possible_keys, do: {k, v}, else: nil
          _ -> nil
        end
      _ -> nil
    end)
  end

  defp extract_from_text(:project, text, acc) do
    case extract_with_regex(text, @project_regex) do
      nil -> acc
      val -> Map.put(acc, :project_id, project(val))
    end
  end

  defp extract_from_text(:cluster, text, acc) do
    case extract_with_regex(text, @cluster_regex) do
      nil -> acc
      val -> Map.put(acc, :cluster_id, cluster(val))
    end
  end

  defp extract_from_text(:service, text, %{cluster_id: id} = acc) when is_binary(id) do
    case extract_with_regex(text, @service_regex) do
      nil -> acc
      val -> Map.put(acc, :service_id, service(id, val))
    end
  end

  defp extract_from_text(_, _, acc), do: acc

  defp extract_with_regex(text, regexes) do
    Enum.find_value(regexes, fn regex ->
      case Regex.run(regex, text) do
        [_, match] -> String.trim(match)
        _ -> nil
      end
    end)
  end

  def extract_text_from_payload(payload) do
    payload
    |> Enum.filter(fn {_, v} -> is_binary(v) end)
    |> Enum.map(fn {_, v} -> v end)
    |> Enum.join("\n")
  end

  # Helper functions for Datadog payload handling

  def normalize_datadog_payload(%{"alerts" => alerts}) when is_list(alerts), do: alerts
  def normalize_datadog_payload(%{"event" => event}) when is_map(event), do: [event]
  def normalize_datadog_payload(%{"events" => events}) when is_list(events), do: events
  def normalize_datadog_payload(%{"alert" => alert}) when is_map(alert), do: [alert]
  def normalize_datadog_payload(%{"series" => _} = event), do: [event] # Metric alert format
  def normalize_datadog_payload(payload) when is_map(payload) do
    if Map.has_key?(payload, "body") or Map.has_key?(payload, "message") or Map.has_key?(payload, "title"), do: [payload], else: []
  end
  def normalize_datadog_payload(_), do: []

  def datadog_tags(%{"tags" => tags}) when is_list(tags) do
    Enum.map(tags, fn
      {k, v} -> %{name: k, value: v}
      tag when is_binary(tag) ->
        case String.split(tag, ":", parts: 2) do
          [k, v] -> %{name: k, value: v}
          [k] -> %{name: k, value: "true"}
        end
      _ -> nil
    end)
    |> Enum.filter(&(&1))
  end
  def datadog_tags(%{"tags" => tags}) when is_map(tags) do
    Enum.map(tags, fn {k, v} -> %{name: k, value: to_string(v)} end)
  end
  def datadog_tags(_), do: []
end
