defmodule Console.GraphQl.Resolvers.Kubernetes do
  alias Kube.Client
  alias Kazan.Apis.Core.V1, as: Core
  alias Kazan.Apis.Apps.V1, as: Apps
  alias Kazan.Apis.Networking.V1, as: Networking
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
    |> Kube.Utils.run()
  end

  def list_log_filters(%{namespace: ns}, _) do
    Client.list_log_filters(ns)
    |> items_response()
  end

  def list_configuration_overlays(%{namespace: ns}, _) do
    Client.list_configuration_overlays(ns)
    |> items_response()
  end

  def execute_overlay(%{namespace: ns, context: ctx}, %{context: %{current_user: user}}),
    do: Console.Services.Runbooks.execute_overlay(ns, ctx, user)

  def resolve_application(%{name: name}, _), do: Client.get_application(name)

  def resolve_service(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Core.read_namespaced_service!(name)
    |> Kube.Utils.run()
  end

  def resolve_deployment(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Apps.read_namespaced_deployment!(name)
    |> Kube.Utils.run()
  end

  def resolve_stateful_set(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Apps.read_namespaced_stateful_set!(name)
    |> Kube.Utils.run()
  end

  def resolve_ingress(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Networking.read_namespaced_ingress!(name)
    |> Kube.Utils.run()
  end

  def resolve_cron_job(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Batch.read_namespaced_cron_job!(name)
    |> Kube.Utils.run()
  end

  def resolve_job(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> BatchV1.read_namespaced_job!(name)
    |> Kube.Utils.run()
  end

  def resolve_config_map(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Core.read_namespaced_config_map!(name)
    |> Kube.Utils.run()
  end

  def resolve_secret(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Core.read_namespaced_secret!(name)
    |> Kube.Utils.run()
  end

  def resolve_certificate(%{namespace: ns, name: name}, _) do
    Client.get_certificate(ns, name)
  end

  def ingress_certificates(%{metadata: %{namespace: ns}, spec: %{tls: [_ | _] = tls}}) do
    names = MapSet.new(tls, & &1.secret_name)
    with {:ok, %{items: certs}} <- Client.list_certificate(ns) do
      {:ok, %{items: Enum.filter(certs, &MapSet.member?(names, &1.metadata.name))}}
    end
  end
  def ingress_certificates(_), do: {:ok, []}

  def list_nodes(_, _) do
    Core.list_node!()
    |> Kube.Utils.run()
    |> items_response()
  end

  def resolve_pod(%{namespace: ns, name: name}, _) do
    Console.namespace(ns)
    |> Core.read_namespaced_pod!(name)
    |> Kube.Utils.run()
  end

  def resolve_node(%{name: name}, _) do
    Core.read_node!(name)
    |> Kube.Utils.run()
  end

  def delete_node(%{name: name}, _) do
    with {:ok, node} <- Core.read_node!(name) |> Kube.Utils.run(),
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
    |> Kube.Utils.run()
  end

  def delete_job(%{namespace: namespace, name: name}, _) do
    %Kazan.Request{
      method: "delete",
      path: "/apis/batch/v1/namespaces/#{Console.namespace(namespace)}/jobs/#{name}",
      query_params: %{},
      response_model: BatchV1.Job
    }
    |> Kube.Utils.run()
  end

  def delete_certificate(%{namespace: ns, name: name}, _) do
    with {:ok, _} <- Client.delete_certificate(ns, name),
      do: {:ok, true}
  end

  def list_events(%{metadata: %{uid: uid, namespace: ns}}) do
    Console.namespace(ns)
    |> Core.list_namespaced_event!(field_selector: "involvedObject.uid=#{uid}")
    |> Kube.Utils.run()
    |> items_response()
  end

  def list_all_events(%{metadata: %{uid: uid}}) do
    Core.list_event_for_all_namespaces!(field_selector: "involvedObject.uid=#{uid}")
    |> Kube.Utils.run()
    |> items_response()
  end

  def list_pods(_, nil), do: {:ok, []}
  def list_pods(%{namespace: ns}, label_selector) do
    Console.namespace(ns)
    |> Core.list_namespaced_pod!(label_selector: construct_label_selector(label_selector))
    |> Kube.Utils.run()
    |> items_response()
  end

  def list_jobs(%{namespace: ns}) do
    Console.namespace(ns)
    |> BatchV1.list_namespaced_job!()
    |> Kube.Utils.run()
    |> items_response()
  end

  def list_config_maps(%{namespace: ns}, _) do
    Console.namespace(ns)
    |> Core.list_namespaced_config_map!()
    |> Kube.Utils.run()
    |> items_response()
  end

  def list_secrets(%{namespace: ns}, _) do
    Console.namespace(ns)
    |> Core.list_namespaced_secret!()
    |> Kube.Utils.run()
    |> items_response()
  end

  def has_owner?(%{metadata: %{owner_references: [%{uid: uid} | _]}}, uid), do: true
  def has_owner?(_, _), do: false

  def list_pods_for_node(%{metadata: %{name:  name}}) do
    Core.list_pod_for_all_namespaces!(field_selector: "spec.nodeName=#{name}")
    |> Kube.Utils.run()
    |> items_response()
  end

  def list_all_pods(%{namespace: ns} = args, _) do
    ns
    |> Core.list_namespaced_pod!(page_params(args))
    |> Kube.Utils.run()
    |> items_connection()
  end

  def list_all_pods(args, _) do
    (page_params(args) ++ namespace_params(args))
    |> Core.list_pod_for_all_namespaces!()
    |> Kube.Utils.run()
    |> items_connection()
  end

  def list_cached_pods(args, _) do
    Console.Cached.Pod.fetch()
    |> maybe_filter_pods(args)
  end

  def raw_resource(%{version: v, kind: k, name: n} = args, %{context: %{service: svc}}) do
    kind = String.downcase(k) |> Inflex.pluralize()
    path = Kube.Client.Base.path(args[:group], v, kind, args[:namespace], n)
    with {:ok, res} <- Kube.Client.raw(path),
         {:ok, res} <- Console.Deployments.Services.accessible(svc, res),
      do: {:ok, %{raw: res}}
  end
  def raw_resource(_, _), do: {:error, "forbidden"}

  defp maybe_filter_pods(pods, %{namespaces: [_ | _] = namespaces}) do
    namespaces = MapSet.new(namespaces)
    {:ok, Enum.filter(pods, &MapSet.member?(namespaces, &1.metadata.namespace))}
  end
  defp maybe_filter_pods(pods, _), do: {:ok, pods}

  def list_namespaces(%{cluster_id: _}, _) do
    Core.list_namespace!()
    |> Kube.Utils.run()
    |> items_response()
  end

  def list_namespaces(_, _), do: {:ok, Console.namespaces()}


  defp namespace_params(%{namespaces: [_ | _] = namespaces}) do
    namespaces = MapSet.new(namespaces)
    ignore_namespaces =
      Console.namespaces()
      |> Enum.filter(& !MapSet.member?(namespaces, &1.metadata.name))
      |> Enum.map(&"metadata.namespace!=#{&1.metadata.name}")
      |> Enum.join(",")

    [fied_selector: ignore_namespaces]
  end
  defp namespace_params(_), do: []

  defp page_params(args), do: Enum.reduce(args, [], &page_params/2)

  defp page_params({:after, cursor}, args), do: [{:continue, cursor} | args]
  defp page_params({:first, limit}, args), do: [{:limit, limit} | args]
  defp page_params(_, args), do: args

  defp items_response({:ok, %{items: items}}), do: {:ok, items}
  defp items_response(err), do: err

  defp items_connection({:ok, %{items: items, metadata: %{continue: cursor}}}) do
    edges = Enum.map(items, &%{node: &1})
    {:ok, %{edges: edges, page_info: %{end_cursor: cursor, has_next_page: byte_size(cursor) != 0}}}
  end
  defp items_connection(err), do: err

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
