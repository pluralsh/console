defmodule Console.Compliance.Datasource.Clusters do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.{Cluster}

  @impl Console.Compliance.Datasource
  def stream do
    Cluster.stream()
    |> Cluster.preloaded([:project])
    |> Console.Repo.stream(method: :keyset)
    |> Stream.map(fn c ->
      %{
        cluster: c.handle,
        project: c.project.name,
        version: c.current_version,
        kubelet_version: c.kubelet_version,
        node_count: c.node_count,
        namespace_count: c.namespace_count,
        pod_count: c.pod_count,
        cpu_total: c.cpu_total,
        memory_total: c.memory_total
      }
    end)
  end
end
