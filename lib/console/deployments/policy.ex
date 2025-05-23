defmodule Console.Deployments.Policy do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.{
    PolicyConstraint,
    ConstraintViolation,
    Cluster,
    VulnerabilityReport,
    Vulnerability,
    Service,
    ComplianceReportGenerator,
    User
  }

  require Logger

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
        report = case Repo.get_by(VulnerabilityReport, cluster_id: id, artifact_url: url) do
          %VulnerabilityReport{} = vuln ->
            Repo.preload(vuln, [:vulnerabilities, :services, :namespaces])
          _ -> %VulnerabilityReport{cluster_id: id, updated_at: DateTime.utc_now()}
        end

        report
        |> VulnerabilityReport.changeset(
          restitch_services(attrs, report.services, svc_map)
          |> stabilize_vulns(report.vulnerabilities)
          |> stabilize_namespaces(report.namespaces)
        )
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
    |> Service.select([:id])
    |> Repo.all()
    |> MapSet.new(& &1.id)
  end

  defp restitch_services(%{services: [_ | _] = svcs} = attrs, current_svcs, svc_map) do
    by_id = Map.new((if is_list(current_svcs), do: current_svcs, else: []), & {&1.service_id, &1})
    svcs =
      Enum.filter(svcs, & is_nil(&1.service_id) || MapSet.member?(svc_map, &1.service_id))
      |> Enum.map(fn %{service_id: id} = svc ->
        case by_id[id] do
          %{id: id} -> Map.put(svc, :id, id)
          _ -> svc
        end
      end)

    %{attrs | services: svcs}
  end
  defp restitch_services(attrs, _, _), do: attrs

  defp stabilize_namespaces(%{namespaces: [_ | _] = ns} = attrs, [_ | _] = current_ns) do
    by_name = Map.new(current_ns, & {&1.namespace, &1})
    ns = Enum.map(ns, fn %{namespace: name} = ns ->
      case by_name[name] do
        %{id: id} -> Map.put(ns, :id, id)
        _ -> ns
      end
    end)
    %{attrs | namespaces: ns}
  end
  defp stabilize_namespaces(attrs, _), do: attrs

  defp stabilize_vulns(%{vulnerabilities: [_ | _] = vulns} = attrs, current_vulns) do
    current_vulns = if is_list(current_vulns), do: current_vulns, else: []
    vulns =
      Enum.sort_by(
        vulns,
        & {&1[:resource], &1[:target], &1[:pkg_path], &1[:installed_version], &1[:primary_link], &1[:score], &1[:last_modified_date]},
        :desc
      )
      |> Enum.uniq_by(& {&1[:resource], &1[:target], nilify(&1[:pkg_path]), nilify(&1[:installed_version]), nilify(&1[:primary_link])})

    lookup = Map.new(current_vulns, & {{&1.resource, &1.target, &1.pkg_path, &1.installed_version, &1.primary_link}, &1})
    vulns  = Enum.map(vulns, fn vuln ->
      vuln = stabilize_links(vuln)
      case lookup[{vuln[:resource], vuln[:target], nilify(vuln[:pkg_path]), nilify(vuln[:installed_version]), nilify(vuln[:primary_link])}] do
        %Vulnerability{id: id} -> Map.put(vuln, :id, id)
        _ -> vuln
      end
    end)
    %{attrs | vulnerabilities: vulns}
  end
  defp stabilize_vulns(attrs, _), do: attrs

  defp nilify(""), do: nil
  defp nilify(x), do: x

  defp stabilize_links(%{links: [_ | _] = links} = vuln), do: Map.put(vuln, :links, Enum.sort(links))
  defp stabilize_links(attrs), do: attrs

  @doc """
  Upserts a set of OPA constraints and returns the count of all added
  """
  @spec upsert_constraints([map], Cluster.t) :: summary_resp
  def upsert_constraints(constraints, %Cluster{id: id}) do
    Enum.reduce(constraints, start_transaction(), fn %{name: name} = attrs, xact ->
      add_operation(xact, name, fn _ ->
        constraint =case Repo.get_by(PolicyConstraint, cluster_id: id, name: name) do
          %PolicyConstraint{} = constraint -> Repo.preload(constraint, [:violations])
          nil -> %PolicyConstraint{cluster_id: id, updated_at: DateTime.utc_now()}
        end

        constraint
        |> PolicyConstraint.changeset(stabilize_violations(attrs, constraint))
        |> Repo.insert_or_update()
      end)
    end)
    |> execute()
    |> when_ok(&map_size/1)
  end

  defp stabilize_violations(%{violations: [_ | _] = violations} = attrs, [_ | _] = current_violations) do
    lookup = Map.new(current_violations, & {{&1.group, &1.version, &1.kind, &1.namespace, &1.name}, &1})
    violations = Enum.map(violations, fn v ->
      case lookup[{v[:group], v[:version], v[:kind], v[:namespace], v[:name]}] do
        %ConstraintViolation{id: id} -> Map.put(v, :id, id)
        _ -> v
      end
    end)
    %{attrs | violations: violations}
  end
  defp stabilize_violations(attrs, _), do: attrs

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
