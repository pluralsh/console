defmodule Console.Deployments.Policy do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.{
    PolicyConstraint,
    Cluster,
    VulnerabilityReport,
    Service,
    ComplianceReportGenerator,
    User
  }

  @type summary_resp :: {:ok, integer} | Console.error
  @type generator_resp :: {:ok, ComplianceReportGenerator.t} | Console.error

  @doc """
  Returns a constraint if present or nil otherwise
  """
  @spec get_constraint(binary) :: PolicyConstraint.t | nil
  def get_constraint(id), do: Repo.get(PolicyConstraint, id)

  @doc """
  Returns a vulnerability report if present
  """
  @spec get_vulnerability(binary) :: VulnerabilityReport.t | nil
  def get_vulnerability(id), do: Repo.get(VulnerabilityReport, id)

  @doc """
  Returns a compliance report generator if present
  """
  @spec get_report_generator(binary) :: ComplianceReportGenerator.t | nil
  def get_report_generator(id), do: Repo.get(ComplianceReportGenerator, id)

  @doc """
  Returns a compliance report generator by name if present
  """
  @spec get_report_generator_by_name(binary) :: ComplianceReportGenerator.t | nil
  def get_report_generator_by_name(name), do: Repo.get_by(ComplianceReportGenerator, name: name)

  @doc """
  Upserts a list of vulnerability reports for a cluster
  """
  @spec upsert_vulnerabilities([map], Cluster.t) :: summary_resp
  def upsert_vulnerabilities(vulns, %Cluster{id: id}) do
    svc_map = find_services(vulns)
    Enum.with_index(vulns)
    |> Enum.reduce(start_transaction(), fn {%{artifact_url: url} = attrs, ind}, xact ->
      add_operation(xact, {:vuln, ind}, fn _ ->
        case Repo.get_by(VulnerabilityReport, cluster_id: id, artifact_url: url) do
          %VulnerabilityReport{} = vuln ->
            Repo.preload(vuln, [:vulnerabilities, :services, :namespaces])
          _ -> %VulnerabilityReport{cluster_id: id, updated_at: DateTime.utc_now()}
        end
        |> VulnerabilityReport.changeset(restitch_services(attrs, svc_map))
        |> Repo.insert_or_update()
      end)
    end)
    |> execute()
    |> when_ok(&map_size/1)
  end

  defp find_services(vulns) do
    Enum.flat_map(vulns, fn
      %{services: [_ | _] = svcs} -> Enum.map(svcs, & &1.service_id)
      _ -> []
    end)
    |> Enum.filter(& &1)
    |> Service.for_ids()
    |> Repo.all()
    |> MapSet.new(& &1.id)
  end

  defp restitch_services(%{services: [_ | _] = svcs} = attrs, svc_map) do
    svcs = Enum.filter(svcs, & is_nil(&1.service_id) || MapSet.member?(svc_map, &1.service_id))
    %{attrs | services: svcs}
  end

  defp restitch_services(attrs, _), do: attrs

  @doc """
  Upserts a set of OPA constraints and returns the count of all added
  """
  @spec upsert_constraints([map], Cluster.t) :: summary_resp
  def upsert_constraints(constraints, %Cluster{id: id}) do
    Enum.reduce(constraints, start_transaction(), fn %{name: name} = constraint, xact ->
      add_operation(xact, name, fn _ ->
        case Repo.get_by(PolicyConstraint, cluster_id: id, name: name) do
          %PolicyConstraint{} = constraint -> Repo.preload(constraint, [:violations])
          nil -> %PolicyConstraint{cluster_id: id, updated_at: DateTime.utc_now()}
        end
        |> PolicyConstraint.changeset(constraint)
        |> Repo.insert_or_update()
      end)
    end)
    |> execute()
    |> when_ok(&map_size/1)
  end

  @spec upsert_compliance_report_generator(map, User.t) :: generator_resp
  def upsert_compliance_report_generator(%{name: name} = attrs, %User{} = user) do
    case get_report_generator_by_name(name) do
      %ComplianceReportGenerator{} = generator -> Repo.preload(generator, [:read_bindings])
      nil -> %ComplianceReportGenerator{}
    end
    |> ComplianceReportGenerator.changeset(attrs)
    |> allow(user, :create)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @spec delete_compliance_report_generator(binary, User.t) :: generator_resp
  def delete_compliance_report_generator(id, %User{} = user) do
    get_report_generator(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end
end
