defmodule Console.Deployments.Observability.Webhook.Raw do
  import Console.Deployments.Observability.Webhook.Base

  @project_regex [~r/plrl-project-([[:alnum:]_\-]+)/, ~r/Plural Project: ([[:alnum:]_\-]+)/]
  @svc_regex [~r/plrl-service-([[:alnum:]_\-]+)/, ~r/plrl-svc-([[:alnum:]_\-]+)\/?/, ~r/Plural Service: ([[:alnum:]_\-\/]+)/]
  @cluster_regex [~r/plrl-cluster-([[:alnum:]_\-]+)/, ~r/Plural Cluster: ([[:alnum:]_\-]+)/]

  def associations(:project, txt, acc), do: extract_and_save(:project, txt, acc)
  def associations(:cluster, txt, acc), do: extract_and_save(:cluster, txt, acc)
  def associations(:service, txt, %{cluster_id: id} = acc) when is_binary(id),
    do: extract_and_save(:service, txt, acc)
  def associations(_, _, acc), do: acc

  def extract_and_save(:project, txt, acc) do
    scrape(:project, txt)
    |> Enum.find_value(&project/1)
    |> put(acc, :project_id)
  end

  def extract_and_save(:cluster, txt, acc) do
    scrape(:cluster, txt)
    |> Enum.find_value(&cluster/1)
    |> put(acc, :cluster_id)
  end

  def extract_and_save(:service, txt, %{cluster_id: id} = acc) do
    scrape(:service, txt)
    |> Enum.find_value(&service(id, &1))
    |> put(acc, :service_id)
  end

  def extract_and_save(:service, txt, acc) do
    scrape(:service, txt)
    |> Enum.find_value(&service/1)
    |> put(acc, :service_id)
  end

  defp scrape(scope, content) do
    regexes(scope)
    |> Enum.flat_map(fn rgx ->
      Regex.scan(rgx, content)
      |> Enum.map(fn
        [_, match] -> match
        _ -> nil
      end)
      |> Enum.filter(& &1)
    end)
  end

  defp regexes(:project), do: @project_regex
  defp regexes(:service), do: @svc_regex
  defp regexes(:cluster), do: @cluster_regex

  defp put(val, acc, key), do: Map.put(acc, key, val)
end
