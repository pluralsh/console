defmodule Console.GraphQl.Resolvers.Kubernetes do
  alias Kube.Client
  alias Kazan.Apis.Core.V1, as: Core
  alias Kazan.Apis.Apps.V1, as: Apps
  alias Kazan.Apis.Extensions.V1beta1, as: Extensions
  alias Kazan.Apis.Batch.V1beta1, as: Batch
  alias Kazan.Apis.Batch.V1, as: BatchV1
  alias Kazan.Models.Apimachinery.Meta.V1.{LabelSelector, LabelSelectorRequirement}

  def list_applications(_, _) do
    with {:ok, %{items: items}} <- Client.list_applications(),
      do: {:ok, items}
  end

  def list_node_metrics(_, _) do
    Client.list_metrics()
    |> items_response()
  end

  def resolve_node_metrics(%{name: name}, _),
    do: Client.get_metrics(name)

  def cluster_info(_, _) do
    Kazan.Apis.Version.get_code!()
    |> Kazan.run()
  end

  def list_log_filters(%{namespace: ns}, _) do
    Console.namespace(ns)
    |> Client.list_log_filters()
    |> items_response()
  end

  def resolve_application(%{name: name}, _), do: Client.get_application(name)

  def resolve_service(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Core.read_namespaced_service!(name)
    |> Kazan.run()
  end

  def resolve_deployment(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Apps.read_namespaced_deployment!(name)
    |> Kazan.run()
  end

  def resolve_stateful_set(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Apps.read_namespaced_stateful_set!(name)
    |> Kazan.run()
  end

  def resolve_ingress(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Extensions.read_namespaced_ingress!(name)
    |> Kazan.run()
  end

  def resolve_cron_job(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Batch.read_namespaced_cron_job!(name)
    |> Kazan.run()
  end

  def resolve_job(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> BatchV1.read_namespaced_job!(name)
    |> Kazan.run()
  end

  def resolve_certificate(%{namespace: ns, name: name}, _) do
    Client.get_certificate(ns, name)
  end

  def list_nodes(_, _) do
    Core.list_node!()
    |> Kazan.run()
    |> items_response()
  end

  def resolve_pod(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Core.read_namespaced_pod!(name)
    |> Kazan.run()
  end

  def resolve_node(%{name: name}, _) do
    Core.read_node!(name)
    |> Kazan.run()
  end

  def delete_node(%{name: name}, _) do
    with {:ok, node} <- Core.read_node!(name) |> Kazan.run(),
         {:ok, _} <- Console.Commands.Plural.terminate(node.metadata.name),
      do: {:ok, node}
  end

  def delete_pod(%{namespace: namespace, name: name}, _) do
    %Kazan.Request{
      method: "delete",
      path: "/api/v1/namespaces/#{Console.namespace(namespace)}/pods/#{name}",
      query_params: %{},
      response_model: Core.Pod
    }
    |> Kazan.run()
  end

  def delete_job(%{namespace: namespace, name: name}, _) do
    %Kazan.Request{
      method: "delete",
      path: "/apis/batch/v1/namespaces/#{Console.namespace(namespace)}/jobs/#{name}",
      query_params: %{},
      response_model: BatchV1.Job
    }
    |> Kazan.run()
  end

  def list_events(%{metadata: %{uid: uid, namespace: ns}}) do
    Console.namespace(ns)
    |> Core.list_namespaced_event!(field_selector: "involvedObject.uid=#{uid}")
    |> Kazan.run()
    |> items_response()
  end

  def list_all_events(%{metadata: %{uid: uid}}) do
    Core.list_event_for_all_namespaces!(field_selector: "involvedObject.uid=#{uid}")
    |> Kazan.run()
    |> items_response()
  end

  def list_pods(_, nil), do: {:ok, []}
  def list_pods(%{namespace: ns}, label_selector) do
    Console.namespace(ns)
    |> Core.list_namespaced_pod!(label_selector: construct_label_selector(label_selector))
    |> Kazan.run()
    |> items_response()
  end

  def list_jobs(%{namespace: ns}) do
    Console.namespace(ns)
    |> BatchV1.list_namespaced_job!()
    |> Kazan.run()
    |> items_response()
  end

  def has_owner?(%{metadata: %{owner_references: [%{uid: uid} | _]}}, uid), do: true
  def has_owner?(_, _), do: false

  def list_pods_for_node(%{metadata: %{name:  name}}) do
    Core.list_pod_for_all_namespaces!(field_selector: "spec.nodeName=#{name}")
    |> Kazan.run()
    |> items_response()
  end

  def list_all_pods(_, _) do
    Core.list_pod_for_all_namespaces!()
    |> Kazan.run()
    |> items_response()
  end

  defp items_response({:ok, %{items: items}}), do: {:ok, items}
  defp items_response(err), do: err

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
