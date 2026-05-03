defmodule Console.AI.Tools.Workbench.Infrastructure.VulnReports do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{Service, VulnerabilityReport}

  embedded_schema do
    field :user,       :map, virtual: true
    field :service_id, :binary_id
  end

  @valid ~w(service_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:service_id)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/vuln_reports.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_vuln_reports"
  def description(_), do: "Lists vulnerability reports for a given service."

  def implement(%__MODULE__{user: user, service_id: service_id}) do
    Repo.get(Service, service_id)
    |> Policies.allow(user, :read)
    |> when_ok(fn _ ->
      VulnerabilityReport.for_service(service_id)
      |> Repo.all()
      |> Enum.map(&simplify/1)
      |> Jason.encode!()
    end)
  end

  defp simplify(vuln_report) do
    Map.take(vuln_report, [:id, :artifact_url, :grade])
    |> Map.merge(counts(vuln_report))
  end

  defp counts(%{summary: %VulnerabilityReport.Summary{} = summary}) do
    %{
      critical_count: summary.critical_count,
      high_count: summary.high_count,
      medium_count: summary.medium_count,
      low_count: summary.low_count,
      unknown_count: summary.unknown_count,
      none_count: summary.none_count
    }
  end
  defp counts(_), do: %{}
end
