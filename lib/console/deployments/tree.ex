defmodule Console.Deployments.Tree do
  use Console.Services.Base
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1
  alias Console.Schema.ServiceComponent

  defmodule Results do
    alias Kazan.Apis.Core.V1, as: CoreV1
    alias Kazan.Apis.Apps.V1, as: AppsV1
    alias Kazan.Apis.Networking.V1, as: NetworkingV1
    alias Kazan.Apis.Batch.V1, as: BatchV1

    @type t :: %__MODULE__{}

    @fields ~w(deployments statefulsets daemonsets services ingresses jobs cronjobs configmaps secrets certificates)a
    defstruct Enum.map(@fields, & {&1, []})

    def fields(), do: @fields

    def queries() do
      %{
        deployments: &AppsV1.list_namespaced_deployment!/1,
        statefulsets: &AppsV1.list_namespaced_stateful_set!/1,
        replicasets: &AppsV1.list_namespaced_replica_set!/1,
        daemonsets: &AppsV1.list_namespaced_daemon_set!/1,
        services: &CoreV1.list_namespaced_service!/1,
        ingresss: &NetworkingV1.list_namespaced_ingress!/1,
        jobs: &BatchV1.list_namespaced_job!/1,
        cronjobs: &BatchV1.list_namespaced_cron_job!/1,
        configmaps: &CoreV1.list_namespaced_config_map!/1,
        secrets: &CoreV1.list_namespaced_secret!/1,
        certificates: {:direct, &Kube.Client.list_certificate/1},
      }
    end

    def merge(%__MODULE__{} = this, %__MODULE__{} = next) do
      Enum.reduce(@fields, %__MODULE__{}, fn field, acc ->
        Map.put(acc, field, Map.get(this, field) ++ Map.get(next, field))
      end)
    end
  end

  @doc """
  Generates a resource tree from the given service component namespace.  The algorithm is basically:

  * fetch all relevant resources in the namespace
  * dfs the set starting from the uid of the top level component and down across the owner references of each resources
  * merge each as the recursion winds up, tracking the resources and edges recorded as uid -> uid pairs
  """
  @spec tree(ServiceComponent.t) :: {:ok, {%Results{}, [%{from: binary, to: binary}]}} | Console.error()
  def tree(%ServiceComponent{kind: k, version: v, name: n, group: g, namespace: ns}) when is_binary(ns) do
    kind = String.downcase(k) |> Inflex.pluralize()
    path = Kube.Client.Base.path(g, v, kind, ns, n)
    with {:ok, %{"metadata" => %{"uid" => uid}} = root} <- Kube.Client.raw(path) do
      resources = gather(ns)
      {results, edges} = recurse(resources, uid)
      results = Map.put(results, :root, %{raw: root, metadata: Kube.Utils.raw_meta(root)})
      {:ok, {results, edges}}
    end
  end
  def tree(_), do: {:error, "cannot generate trees for cluster-scoped resources"}

  defp recurse(resources, uid) do
    level = Enum.into(Results.fields(), %{}, fn name ->
      subset = Enum.filter(resources[name] || [], fn
        %{metadata: %MetaV1.ObjectMeta{owner_references: [_ | _] = refs}} ->
          Enum.any?(refs, & &1.uid == uid)
        _ -> false
      end)
      {name, subset}
    end)

    edges = Enum.flat_map(level, fn {_, vals} ->
      Enum.map(vals, & %{from: uid, to: &1.metadata.uid})
    end)

    Enum.flat_map(level, fn {_, vals} -> vals end)
    |> Enum.reduce({struct(Results, level), edges}, fn obj, {results, edges} ->
      {nested, nested_edge} = recurse(resources, obj.metadata.uid)
      {Results.merge(results, nested), edges ++ nested_edge}
    end)
  end

  defp gather(ns) do
    conf = Kube.Utils.kubeconfig()
    Results.queries()
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
