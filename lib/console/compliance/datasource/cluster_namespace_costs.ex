defmodule Console.Compliance.Datasource.ClusterNamespaceCosts do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.ClusterNamespaceUsage

  @impl Console.Compliance.Datasource
  def stream do
    ClusterNamespaceUsage.stream()
    |> ClusterNamespaceUsage.preloaded([cluster: :project])
    |> Console.Repo.stream(method: :keyset)
    |> Stream.map(fn usage ->
      %{
        cluster: usage.cluster.handle,
        project: usage.cluster.project.name,
        namespace: usage.namespace,
        cpu_cost: usage.cpu_cost,
        memory_cost: usage.memory_cost,
        gpu_cost: usage.gpu_cost,
        load_balancer_cost: usage.load_balancer_cost,
        ingress_cost: usage.ingress_cost,
        egress_cost: usage.egress_cost,
        storage_cost: usage.storage_cost,
        created_at: usage.inserted_at,
        updated_at: usage.updated_at
      }
    end)
  end
end
