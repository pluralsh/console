defmodule Console.Compliance.Datasource.Clusters do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.Cluster

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
      }
    end)
  end
end
