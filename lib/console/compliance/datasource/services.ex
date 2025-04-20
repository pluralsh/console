defmodule Console.Compliance.Datasource.Services do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.Service

  @impl Console.Compliance.Datasource
  def stream do
    Service.stream()
    |> Service.preloaded([:repository, cluster: :project])
    |> Console.Repo.stream(method: :keyset)
    |> Stream.map(fn s ->
      %{
        cluster: s.cluster.handle,
        service: s.name,
        project: s.cluster.project.name,
        namespace: s.namespace,
        health: s.status,
        repository: Console.deep_get(s, [:repository, :url]),
        git_ref: Console.deep_get(s, [:git, :ref]),
        git_folder: Console.deep_get(s, [:git, :folder]),
        helm_url: Console.deep_get(s, [:helm, :url]),
        helm_chart: Console.deep_get(s, [:helm, :chart]),
        helm_version: Console.deep_get(s, [:helm, :version]),
      }
    end)
  end
end
