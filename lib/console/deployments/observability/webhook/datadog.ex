defmodule Console.Deployments.Observability.Webhook.Datadog do
  @behaviour Console.Deployments.Observability.Webhook
  import Console.Deployments.Observability.Webhook.Base

  def associations(scope, payload, acc) do
    handle_associations(scope, payload, acc)
  end

  defp handle_associations(:project, payload, acc) do
    cond do
      val = get_in(payload, ["meta", "project"]) ->
        Map.put(acc, :project_id, project(val))

      val = Map.get(payload, "project") ->
        Map.put(acc, :project_id, project(val))

      is_list(payload["tags"]) ->
        tag_map = tags_to_map(payload["tags"])
        case Map.get(tag_map, "plrl_project") || Map.get(tag_map, "project") || Map.get(tag_map, "plural_project") do
          nil -> acc
          val -> Map.put(acc, :project_id, project(val))
        end

      true -> acc
    end
  end

  defp handle_associations(:cluster, payload, acc) do
    cond do
      val = get_in(payload, ["meta", "cluster"]) ->
        Map.put(acc, :cluster_id, cluster(val))

      val = Map.get(payload, "cluster") ->
        Map.put(acc, :cluster_id, cluster(val))

      is_list(payload["tags"]) ->
        tag_map = tags_to_map(payload["tags"])
        case Map.get(tag_map, "plrl_cluster") || Map.get(tag_map, "cluster") || Map.get(tag_map, "plural_cluster") do
          nil -> acc
          val -> Map.put(acc, :cluster_id, cluster(val))
        end

      true -> acc
    end
  end

  defp handle_associations(:service, payload, %{cluster_id: id} = acc) when is_binary(id) do
    cond do
      val = get_in(payload, ["meta", "service"]) ->
        Map.put(acc, :service_id, service(id, val))

      val = Map.get(payload, "service") ->
        Map.put(acc, :service_id, service(id, val))

      is_list(payload["tags"]) ->
        tag_map = tags_to_map(payload["tags"])
        case Map.get(tag_map, "plrl_service") || Map.get(tag_map, "service") || Map.get(tag_map, "plural_service") do
          nil -> acc
          val -> Map.put(acc, :service_id, service(id, val))
        end

      true -> acc
    end
  end

  defp handle_associations(:service, _payload, acc), do: acc

  defp tags_to_map(tags) do
    Enum.reduce(tags, %{}, fn tag, acc ->
      case String.split(tag, ":", parts: 2) do
        [k, v] -> Map.put(acc, k, v)
        _ -> acc
      end
    end)
  end


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

  def datadog_tag_map(%{"tags" => tags}) when is_list(tags) do
    tags_to_map(tags)
  end
  def datadog_tag_map(%{"tags" => tags}) when is_map(tags) do
    tags
  end
  def datadog_tag_map(_), do: %{}
end
