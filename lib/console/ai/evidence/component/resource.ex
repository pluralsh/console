defmodule Console.AI.Evidence.Component.Resource do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.Component.{
    Deployment,
    StatefulSet,
    DaemonSet,
    Ingress,
    CronJob,
    Job,
    Raw,
    Certificate
  }
  alias Console.Schema.ServiceComponent

  def resource(%ServiceComponent{group: "apps", version: "v1", kind: "Deployment"} = c, _) do
    AppsV1.read_namespaced_deployment!(c.namespace, c.name)
    |> Kube.Utils.run()
  end
  def resource(%ServiceComponent{group: "apps", version: "v1", kind: "StatefulSet"} = c, _) do
    AppsV1.read_namespaced_stateful_set!(c.namespace, c.name)
    |> Kube.Utils.run()
  end
  def resource(%ServiceComponent{group: "apps", version: "v1", kind: "DaemonSet"} = c, _) do
    AppsV1.read_namespaced_daemon_set!(c.namespace, c.name)
    |> Kube.Utils.run()
  end
  def resource(%ServiceComponent{group: "networking.k8s.io", version: "v1", kind: "Ingress", namespace: ns, name: n}, _) do
    NetworkingV1.read_namespaced_ingress!(ns, n)
    |> Kube.Utils.run()
  end
  def resource(%ServiceComponent{group: "batch", version: "v1", kind: "CronJob", namespace: ns, name: n}, _) do
    BatchV1.read_namespaced_cron_job!(ns, n)
    |> Kube.Utils.run()
  end
  def resource(%ServiceComponent{group: "batch", version: "v1", kind: "Job", namespace: ns, name: n}, _) do
    BatchV1.read_namespaced_job!(ns, n)
    |> Kube.Utils.run()
  end
  def resource(%ServiceComponent{group: "cert-manager.io", version: "v1", kind: "Certificate"} = c, _),
    do: Kube.Client.get_certificate(c.namespace, c.name)
  def resource(%ServiceComponent{group: g, version: v, kind: k} = comp, cluster) do
    kind = get_kind(cluster, g, v, k)
    Kube.Client.Base.path(g, v, kind, comp.namespace, comp.name)
    |> Kube.Client.raw()
  end

  def events(resource) do
    case details(resource) do
      {uid, ns} when is_binary(ns) ->
        CoreV1.list_namespaced_event!(ns, field_selector: "involvedObject.uid=#{uid}")
        |> Kube.Utils.run()
      _ -> {:ok, []}
    end
  end

  def hydrate(resource) do
    do_hydrate(resource)
    |> as_history()
  end

  def generate(resource) do
    with {:ok, events} <- events(resource),
         {:ok, hydration, claims} <- hydrate(resource) do
      {:ok, [{:user, """
          The kubernetes component #{description(resource)} could also be related.

          The raw json object itself is as follows:

          ```json
          #{encode(resource)}
          ```
          """
        }]
        ++ tpl_events(events)
        ++ tpl_hydration(hydration), claims}
    end
  end

  defp tpl_hydration([_ | _] = hydration) do
    [
      {:user, "And I've also found some more useful context to help understand what's going on with this component"}
      | hydration
    ]
  end
  defp tpl_hydration(_), do: []

  defp description(resource) do
    {g, v, k, namespace, name} = Kube.Utils.identifier(resource)
    "#{g}/#{v} #{k}#{ns(namespace)} with name #{name}"
  end

  defp do_hydrate(%AppsV1.Deployment{} = dep), do: Deployment.hydrate(dep)
  defp do_hydrate(%AppsV1.StatefulSet{} = ss), do: StatefulSet.hydrate(ss)
  defp do_hydrate(%AppsV1.DaemonSet{} = ds), do: DaemonSet.hydrate(ds)
  defp do_hydrate(%NetworkingV1.Ingress{} = ing), do: Ingress.hydrate(ing)
  defp do_hydrate(%BatchV1.CronJob{} = cj), do: CronJob.hydrate(cj)
  defp do_hydrate(%BatchV1.Job{} = cj), do: Job.hydrate(cj)
  defp do_hydrate(%Kube.Certificate{} = cert), do: Certificate.hydrate(cert)
  defp do_hydrate(%{"metadata" => _} = raw), do: Raw.hydrate(raw)
  defp do_hydrate(_), do: {:ok, []}

  defp details(%{metadata: %{uid: uid} = meta}), do: {uid, Map.get(meta, :namespace)}
  defp details(%{"metadata" => %{"uid" => uid} = meta}), do: {uid, meta["namespace"]}
end
