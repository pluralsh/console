defmodule Console.Compliance.Datasource.Vulnerabilities do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.VulnerabilityReport

  @impl Console.Compliance.Datasource
  def stream do
    VulnerabilityReport.stream()
    |> VulnerabilityReport.preloaded([cluster: :project])
    |> Console.Repo.stream(method: :keyset)
    |> Stream.map(fn vr ->
      %{
        cluster: vr.cluster.handle,
        project: vr.cluster.project.name,
        artifact: vr.artifact_url,
        grade: vr.grade,
        critical_count: Console.deep_get(vr, [:summary, :critical_count]),
        high_count: Console.deep_get(vr, [:summary, :high_count]),
        medium_count: Console.deep_get(vr, [:summary, :medium_count]),
        low_count: Console.deep_get(vr, [:summary, :low_count]),
        artifact_registry: Console.deep_get(vr, [:artifact, :registry]),
        artifact_repository: Console.deep_get(vr, [:artifact, :repository]),
        artifact_digest: Console.deep_get(vr, [:artifact, :digest]),
        artifact_tag: Console.deep_get(vr, [:artifact, :tag]),
      }
    end)
  end
end
