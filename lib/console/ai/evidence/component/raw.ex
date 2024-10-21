defmodule Console.AI.Evidence.Component.Raw do
  use Console.AI.Evidence.Base
  alias Console.Deployments.Tree
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1
  alias Console.AI.Evidence.Component.Resource

  @kind_blacklist ~w(
    ServiceDeployment
    GlobalService
    GitRepository
    HelmRepository
    Cluster
    InfrastructureStack
    ScmProvider
    PrAutomation
    Catalog
    Project
    NamespaceCredentials
    DeploymentSettings
    OidcProvider
    Pipeline
    Observer
    StackDefinition
    NotificationRouter
    NotificationSink
    ManagedNamespace
    DnsEndpoint
    ClusterIssuer
    Issuer
    ServiceMonitor
    PodMonitor
    PrometheusRule
  ) # ignore crds which we know don't cascade to other resources, mostly our own

  def hydrate(%{"kind" => k, "metadata" => %{"namespace" => ns, "uid" => uid}})
      when is_binary(ns) and k not in @kind_blacklist do
    gather(ns)
    |> Enum.flat_map(fn {_, vals} -> vals end)
    |> gen_msgs(uid)
  end
  def hydrate(_), do: {:ok, []}

  defp gen_msgs([], _), do: {:ok, []}
  defp gen_msgs(results, uid) do
    conf = Kube.Utils.kubeconfig()

    Enum.filter(results, fn
      %{metadata: %MetaV1.ObjectMeta{owner_references: [_ | _] = refs}} ->
        Enum.any?(refs, & &1.uid == uid)
      _ -> false
    end)
    |> Task.async_stream(fn resource ->
      Kube.Utils.save_kubeconfig(conf)
      Resource.generate(resource)
    end)
    |> Enum.filter(fn
      {:ok, {:ok, _}} -> true
      _ -> false
    end)
    |> Enum.flat_map(fn {:ok, {:ok, msgs}} -> msgs end)
    |> prepend([{:user, "this resource owns a set of other kubernetes resources, that I can find and list out for you below"}])
    |> ok()
  end

  defp gather(ns) do
    conf = Kube.Utils.kubeconfig()
    Tree.Results.queries()
    |> Map.drop([:secrets, :configmaps])
    |> Enum.reduce(ParallelTask.new(), fn {name, q}, group ->
      ParallelTask.add(group, name, fn ->
        Kube.Utils.save_kubeconfig(conf)
        case fetch(q, ns) do
          {:ok, %{items: items}} -> items
          _ -> []
        end
      end)
    end)
    |> ParallelTask.perform()
  end

  defp fetch({:direct, fun}, ns), do: fun.(ns)
  defp fetch(fun, ns) do
    fun.(ns)
    |> Kube.Utils.run()
  end
end
