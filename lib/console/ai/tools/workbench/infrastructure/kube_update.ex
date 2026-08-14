defmodule Console.AI.Tools.Workbench.Infrastructure.KubeUpdate do
  use Console.AI.Tools.Agent.Base
  import Console.GraphQl.Resolvers.Kubernetes, only: [get_kind: 4]
  import EctoEnum
  alias Console.Schema.{Cluster, WorkbenchJob}
  alias Console.Deployments.Clusters
  alias Console.AI.Tools.Workbench.KubeRequest

  defenum Operation, replace: 0, apply: 1

  embedded_schema do
    field :user,            :map, virtual: true
    field :job,             :map, virtual: true
    field :operation,       Operation, default: :replace
    field :cluster,         :string
    field :group,           :string
    field :version,         :string
    field :kind,            :string
    field :name,            :string
    field :namespace,       :string
    field :json,            :string
    field :explanation,     :string
  end

  @valid ~w(cluster operation group version kind name namespace json explanation)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_change(:json, fn :json, json ->
      case JSON.decode(json) do
        {:ok, _map} -> []
        {:error, _} -> [{:json, "is not valid JSON"}]
      end
    end)
    |> update_change(:json, fn json ->
      with {:ok, map} <- JSON.decode(json) do
        Map.drop(map, ~w(status))
        |> JSON.encode!()
      end
    end)
    |> check_policy(model.job)
    |> validate_required([:cluster, :version, :kind, :name, :json, :explanation])
  end

  def check_policy(changeset, %WorkbenchJob{modes: %{kubernetes: %{} = k8s}}) do
    validate_change(changeset, :namespace, fn
      :namespace, ns when is_binary(ns) ->
        Map.take(k8s, ~w(exclude_namespaces require_namespaces)a)
        |> Enum.reduce([], fn
          {:exclude_namespaces, [_ | _] = namespaces}, acc ->
            if ns in namespaces, do: acc ++ [{:namespace, "#{Enum.join(namespaces, ", ")} are excluded from updates"}], else: acc
          {:require_namespaces, [_ | _] = namespaces}, acc ->
            if ns in namespaces, do: acc, else: acc ++ [{:namespace, "is not in the required namespaces #{Enum.join(namespaces, ", ")}"}]
          _, acc -> acc
        end)
      _, _ -> []
    end)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/kube_update.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "update_k8s_resource"
  def description(_) do
    """
    Updates a resource in kubernetes. This is only possible if the user has necessary RBAC permissions.

    You can toggle between server-side apply or full replace operations depending on the edit needed.  Full edits are usually
    only necessary when an apply would result in ambiguity (eg removing elements from a container array).
    Server-side apply takes ownership of conflicting fields to mirror the deployment operator's apply behavior.
    """
  end

  def implement(%__MODULE__{operation: op, cluster: handle, group: g, version: v, kind: k, json: json, explanation: explanation} = comp) do
    with {:cluster, %Cluster{} = cluster} <- {:cluster, Clusters.get_cluster_by_handle(handle)},
         {:kind, kind} <- {:kind, get_kind(cluster, g, v, k)},
         path <- Kube.Client.Base.path(g, v, kind, comp.namespace, comp.name) do
      build_request(op, handle, path, json, explanation)
    else
      {:kind, _} -> {:ok, "I cannot fetch the details of secrets for you"}
      {:cluster, _} -> {:ok, "No cluster found matching handle=#{handle}"}
      err -> {:error, "Error fetching resource: #{inspect(err)}"}
    end
  end

  defp build_request(:apply, handle, path, json, explanation) do
    KubeRequest.new(
      handle: handle,
      method: "patch",
      path: path,
      content_type: "application/apply-patch+yaml",
      query_params: %{"fieldManager" => "plural", "force" => "true"},
      body: json,
      explanation: explanation
    )
  end

  defp build_request(_, handle, path, json, explanation) do
    KubeRequest.new(
      handle: handle,
      method: "put",
      path: path,
      content_type: "application/json",
      body: json,
      explanation: explanation
    )
  end
end
