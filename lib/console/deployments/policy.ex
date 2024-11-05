defmodule Console.Deployments.Policy do
  use Console.Services.Base
  alias Console.Schema.{PolicyConstraint, Cluster, VulnerabilityReport}

  @type summary_resp :: {:ok, integer} | Console.error

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
  Upserts a list of vulnerability reports for a cluster
  """
  @spec upsert_vulnerabilities([map], Cluster.t) :: summary_resp
  def upsert_vulnerabilities(vulns, %Cluster{id: id} = cluster) do
    Enum.with_index(vulns)
    |> Enum.reduce(clear_vulns(cluster), fn {attrs, ind}, xact ->
      add_operation(xact, {:vuln, ind}, fn _ ->
        %VulnerabilityReport{cluster_id: id}
        |> VulnerabilityReport.changeset(attrs)
        |> Repo.insert()
      end)
    end)
    |> execute()
    |> when_ok(& map_size(&1) - 1)
  end

  defp clear_vulns(%Cluster{} = cluster) do
    start_transaction()
    |> add_operation(:wipe, fn _ ->
      VulnerabilityReport.for_cluster(cluster.id)
      |> Repo.delete_all()
      |> elem(0)
      |> ok()
    end)
  end

  @doc """
  Upserts a set of OPA constraints and returns the count of all added
  """
  @spec upsert_constraints([map], Cluster.t) :: summary_resp
  def upsert_constraints(constraints, %Cluster{id: id}) do
    Enum.reduce(constraints, start_transaction(), fn %{name: name} = constraint, xact ->
      add_operation(xact, name, fn _ ->
        case Repo.get_by(PolicyConstraint, cluster_id: id, name: name) do
          %PolicyConstraint{} = constraint -> Repo.preload(constraint, [:violations])
          nil -> %PolicyConstraint{cluster_id: id}
        end
        |> PolicyConstraint.changeset(constraint)
        |> Repo.insert_or_update()
      end)
    end)
    |> add_operation(:wipe, fn _ ->
      names = Enum.map(constraints, &Map.get(&1, :name))
              |> Enum.filter(& &1)
      PolicyConstraint.for_cluster(id)
      |> PolicyConstraint.without_names(names)
      |> Repo.delete_all()
      |> ok()
    end)
    |> execute()
    |> when_ok(&map_size/1)
  end
end
