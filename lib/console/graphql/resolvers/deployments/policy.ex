defmodule Console.GraphQl.Resolvers.Deployments.Policy do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Policy, Clusters}
  alias Console.Schema.{PolicyConstraint, Cluster}

  def resolve_policy_constraint(%{id: id}, %{context: %{current_user: user}}) do
    Policy.get_constraint(id)
    |> allow(user, :read)
  end

  def list_policy_constraints(cluster, args, _) do
    PolicyConstraint.for_cluster(cluster.id)
    |> PolicyConstraint.ordered()
    |> paginate(args)
  end

  def fetch_constraint(%{ref: %{name: name, kind: kind}, cluster_id: cluster_id}, _, _) do
    path = Kube.Client.Base.path("constraints.gatekeeper.sh", "v1beta1", kind, nil, name)
    with %Cluster{} = cluster <- Clusters.get_cluster(cluster_id),
         _ <- save_kubeconfig(cluster),
         {:ok, res} <- Kube.Client.raw(path),
      do: {:ok, %{raw: res, metadata: Kube.Utils.raw_meta(res)}}
  end
  def fetch_constraint(_, _, _), do: {:ok, nil}

  def upsert_policy_constraints(%{constraints: constraints}, %{context: %{cluster: cluster}}),
    do: Policy.upsert_constraints(constraints, cluster)
end
