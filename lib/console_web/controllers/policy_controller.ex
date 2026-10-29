defmodule ConsoleWeb.PolicyController do
  @moduledoc """
  Bulk uploads of a cluster's vulnerability reports and policy constraints from the deployment operator.

  Bodies mirror the underlying schemas, with snake_case keys and lowercase enum values, and each upload
  replaces the matching reports or constraints of the cluster the deploy token belongs to.
  """
  use ConsoleWeb, :controller
  import ConsoleWeb.Params, only: [permit: 2, require_keys: 2]
  alias Console.Deployments.Policy
  alias ConsoleWeb.Plugs.Token

  action_fallback ConsoleWeb.FallbackController

  @cvss ~w(v2_vector v3_vector v40_vector v2_score v3_score v40_score)a

  @vulnerability ~w(
    resource fixed_version installed_version severity score title description cvss_source primary_link
    links target class package_type pkg_path published_date last_modified_date vuln_id repository_url agent_runtime
  )a ++ [cvss: [nvidia: @cvss, redhat: @cvss]]

  @report ~w(artifact_url artifact_repo_url artifact_language artifact_language_version agent_runtime)a ++ [
    os: ~w(eosl family name)a,
    summary: ~w(none_count low_count medium_count high_count critical_count)a,
    artifact: ~w(registry repository digest tag mime)a,
    vulnerabilities: @vulnerability,
    services: [:service_id],
    namespaces: [:namespace]
  ]

  @constraint ~w(name description recommendation violation_count enforcement)a ++ [
    ref: ~w(kind name)a,
    violations: ~w(group version kind namespace name message)a
  ]

  @doc """
  Upserts vulnerability reports, posted as `{"reports": [...]}` and keyed by `artifact_url`.
  """
  def vulnerabilities(conn, %{"reports" => reports}) when is_list(reports) do
    with {:ok, cluster} <- Token.fetch_cluster(conn),
         {:ok, reports} <- require_keys(permit(reports, @report), [:artifact_url]),
         {:ok, count} <- Policy.upsert_vulnerabilities(reports, cluster),
      do: json(conn, %{count: count})
  end
  def vulnerabilities(_, _), do: {:error, {:bad_request, ~s(expected a body like {"reports": [...]})}}

  @doc """
  Upserts policy constraints, posted as `{"constraints": [...]}` and keyed by `name`.
  """
  def constraints(conn, %{"constraints" => constraints}) when is_list(constraints) do
    with {:ok, cluster} <- Token.fetch_cluster(conn),
         {:ok, constraints} <- require_keys(permit(constraints, @constraint), [:name]),
         {:ok, count} <- Policy.upsert_constraints(constraints, cluster),
      do: json(conn, %{count: count})
  end
  def constraints(_, _), do: {:error, {:bad_request, ~s(expected a body like {"constraints": [...]})}}
end
