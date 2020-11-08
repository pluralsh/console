defmodule Watchman.GraphQl.Resolvers.Kubernetes do
  alias Watchman.Kube.Client
  alias Kazan.Apis.Core.V1, as: Core
  alias Kazan.Apis.Apps.V1, as: Apps
  alias Kazan.Apis.Extensions.V1beta1, as: Extensions
  alias Kazan.Apis.Batch.V1beta1, as: Batch
  alias Kazan.Models.Apimachinery.Meta.V1.{LabelSelector, LabelSelectorRequirement}

  def list_applications(_, _) do
    with {:ok, %{items: items}} <- Client.list_applications(),
      do: {:ok, items}
  end

  def resolve_application(%{name: name}, _), do: Client.get_application(name)

  def resolve_service(%{namespace: ns, name: name}, _) do
    Core.read_namespaced_service!(ns, name)
    |> Kazan.run()
  end

  def resolve_deployment(%{namespace: ns, name: name}, _) do
    Apps.read_namespaced_deployment!(ns, name)
    |> Kazan.run()
  end

  def resolve_stateful_set(%{namespace: ns, name: name}, _) do
    Apps.read_namespaced_stateful_set!(ns, name)
    |> Kazan.run()
  end

  def resolve_ingress(%{namespace: ns, name: name}, _) do
    Extensions.read_namespaced_ingress!(ns, name)
    |> Kazan.run()
  end

  def resolve_cron_job(%{namespace: ns, name: name}, _) do
    Batch.read_namespaced_cron_job!(ns, name)
    |> Kazan.run()
  end

  def list_nodes(_, _) do
    Core.list_node!()
    |> Kazan.run()
    |> case do
      {:ok, %{items: nodes}} -> {:ok, nodes}
      error -> error
    end
  end

  def resolve_pod(%{namespace: ns, name: name}, _) do
    Core.read_namespaced_pod!(ns, name)
    |> Kazan.run()
  end

  def resolve_node(%{name: name}, _) do
    Core.read_node!(name)
    |> Kazan.run()
  end

  def delete_pod(%{namespace: namespace, name: name}, _) do
    %Kazan.Request{
      method: "delete",
      path: "/api/v1/namespaces/#{namespace}/pods/#{name}",
      query_params: %{},
      response_model: Core.Pod
    }
    |> Kazan.run()
  end

  def list_events(%{metadata: %{uid: uid, namespace: namespace}}) do
    Core.list_namespaced_event!(namespace, field_selector: "involvedObject.uid=#{uid}")
    |> Kazan.run()
    |> case do
      {:ok, %{items: events}} -> {:ok, events}
      error -> error
    end
  end

  def list_all_events(%{metadata: %{uid: uid}}) do
    Core.list_event_for_all_namespaces!(field_selector: "involvedObject.uid=#{uid}")
    |> Kazan.run()
    |> case do
      {:ok, %{items: events}} -> {:ok, events}
      error -> error
    end
  end

  def list_pods(%{namespace: namespace}, label_selector) do
    Core.list_namespaced_pod!(namespace, label_selector: construct_label_selector(label_selector))
    |> Kazan.run()
    |> case do
      {:ok, %{items: pods}} -> {:ok, pods}
      error -> error
    end
  end

  def list_pods_for_node(%{metadata: %{name:  name}}) do
    Core.list_pod_for_all_namespaces!(field_selector: "spec.nodeName=#{name}")
    |> Kazan.run()
    |> case do
      {:ok, %{items: pods}} -> {:ok, pods}
      error -> error
    end
  end

  defp construct_label_selector(%LabelSelector{match_labels: labels, match_expressions: expressions}) do
    (build_labels(labels) ++ build_expressions(expressions))
    |> Enum.join(",")
  end
  defp construct_label_selector(%{} = labels), do: Enum.join(build_labels(labels), ",")

  defp build_labels(labels) when map_size(labels) > 0,
    do: Enum.map(labels, fn {k, v} -> "#{k}=#{v}" end)
  defp build_labels(_), do: []

  defp build_expressions([_ | _] = expressions) do
    Enum.map(expressions, fn
      %LabelSelectorRequirement{key: key, operator: op, values: [_ | _] = values} when op in ["In", "NotIn"] ->
        "#{key} #{String.downcase(op)} (#{Enum.join(values, ",")})"
      %LabelSelectorRequirement{key: key, operator: "Exists"} -> key
      %LabelSelectorRequirement{key: key} -> "!#{key}"
    end)
  end
  defp build_expressions(_), do: []
end