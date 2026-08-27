defmodule Console.GraphQl.Resolvers.Deployments.Policy do
  use Console.GraphQl.Resolvers.Deployments.Base
  import Absinthe.Resolution.Helpers, only: [batch: 3]
  alias Console.Deployments.{Policy, Clusters, Policies}
  alias Console.Schema.{BindingPolicy, StackPolicy, WorkbenchPolicy, PolicyConstraint, PolicyEvaluation, Cluster, VulnerabilityReport, ComplianceReport, ComplianceReportGenerator}
  alias Console.Schema.Policy, as: PolicySchema

  def resolve_policy(%{id: id}, %{context: %{current_user: user}}) when is_binary(id) do
    Policy.get_policy(id)
    |> Policies.allow(user, :read)
  end

  def resolve_policy(%{name: name}, %{context: %{current_user: user}}) when is_binary(name) do
    Policy.get_policy_by_name(name)
    |> Policies.allow(user, :read)
  end

  def resolve_policy(_, _), do: {:error, "must specify either id or name"}

  def list_policies(args, %{context: %{current_user: user}}) do
    PolicySchema.for_user(user)
    |> PolicySchema.ordered()
    |> maybe_search(PolicySchema, args)
    |> policy_filters(args)
    |> paginate(args)
  end

  def resolve_binding_policy(%{id: id}, %{context: %{current_user: user}}) do
    Policy.get_binding_policy(id)
    |> Policies.allow(user, :read)
  end

  def list_binding_policies(args, %{context: %{current_user: user}}) do
    BindingPolicy.for_user(user)
    |> paginate(args)
  end

  def list_policy_stack_policies(policy, args, _) do
    StackPolicy.for_policy(policy.id)
    |> paginate(args)
  end

  def list_policy_workbench_policies(policy, args, _) do
    WorkbenchPolicy.for_policy(policy.id)
    |> paginate(args)
  end

  def list_policy_evaluations(policy, args, _) do
    PolicyEvaluation.for_policy(policy.id)
    |> PolicyEvaluation.ordered()
    |> paginate(args)
  end

  def policy_match_count(%{id: id}, _, _) do
    batch({__MODULE__, :policy_match_counts}, id, fn counts ->
      {:ok, Map.get(counts, id, 0)}
    end)
  end

  def policy_match_counts(_, ids) do
    BindingPolicy.match_counts_for_bind_policies(ids)
  end

  def policy_evaluation_count(%{id: id}, _, _) do
    count =
      PolicyEvaluation.for_policy(id)
      |> Console.Repo.aggregate(:count)

    {:ok, count}
  end

  def workbench_attachment_count(%{id: id}, _, _) do
    batch({__MODULE__, :workbench_attachment_counts}, id, fn counts ->
      {:ok, Map.get(counts, id, 0)}
    end)
  end

  def workbench_attachment_counts(_, ids) do
    WorkbenchPolicy.counts_for_policies(ids)
  end

  def stack_attachment_count(%{id: id}, _, _) do
    batch({__MODULE__, :stack_attachment_counts}, id, fn counts ->
      {:ok, Map.get(counts, id, 0)}
    end)
  end

  def stack_attachment_counts(_, ids) do
    StackPolicy.counts_for_policies(ids)
  end

  def evaluate_policy(%{policy_id: id, input: input, policy: source}, _)
      when is_binary(source) do
    with %{type: type} <- Policy.get_policy(id) do
      Policy.evaluate_custom_policy(type, source, input)
    else
      _ -> {:error, "not found"}
    end
  end
  def evaluate_policy(%{policy_id: id, input: input}, %{context: %{current_user: user}}),
    do: Policy.evaluate_policy(id, input, user)

  def resolve_vulnerability(%{id: id}, %{context: %{current_user: user}}) do
    Policy.get_vulnerability(id)
    |> allow(user, :read)
  end

  def resolve_policy_constraint(%{id: id}, %{context: %{current_user: user}}) do
    Policy.get_constraint(id)
    |> allow(user, :read)
  end

  def list_vulnerabilities(args, %{context: %{current_user: user}}) do
    VulnerabilityReport.for_user(user)
    |> VulnerabilityReport.ordered()
    |> maybe_search(VulnerabilityReport, args)
    |> vuln_filters(args)
    |> VulnerabilityReport.distinct()
    |> paginate(args)
  end

  def list_policy_constraints(args, %{context: %{current_user: user}}) do
    PolicyConstraint.for_user(user)
    |> PolicyConstraint.ordered()
    |> maybe_search(PolicyConstraint, args)
    |> apply_filters(args)
    |> PolicyConstraint.distinct()
    |> paginate(args)
  end

  def list_policy_constraints(cluster, args, _) do
    PolicyConstraint.for_cluster(cluster.id)
    |> PolicyConstraint.ordered()
    |> maybe_search(PolicyConstraint, args)
    |> apply_filters(args)
    |> PolicyConstraint.distinct()
    |> paginate(args)
  end

  def list_compliance_reports(args, %{context: %{current_user: _user}}) do
    ComplianceReport.ordered()
    |> paginate(args)
  end

  def list_compliance_reports(generator, args, %{context: %{current_user: _user}}) do
    ComplianceReport.ordered()
    |> ComplianceReport.for_generator(generator.id)
    |> paginate(args)
  end

  def list_compliance_report_generators(args, %{context: %{current_user: user}}) do
    ComplianceReportGenerator.for_user(user)
    |> ComplianceReportGenerator.ordered()
    |> paginate(args)
  end

  def resolve_compliance_report_generator(%{id: id}, %{context: %{current_user: user}}) when is_binary(id) do
    Policy.get_report_generator(id)
    |> Policies.allow(user, :read)
  end

  def resolve_compliance_report_generator(%{name: name}, %{context: %{current_user: user}}) when is_binary(name) do
    Policy.get_report_generator_by_name(name)
    |> Policies.allow(user, :read)
  end

  def resolve_compliance_report_generator(_, _), do: {:error, "must specify either id or name"}

  def policy_statistics(%{aggregate: f} = args, %{context: %{current_user: user}}) do
    PolicyConstraint.for_user(user)
    |> apply_filters(args)
    |> PolicyConstraint.aggregate(f)
    |> Console.Repo.all()
    |> ok()
  end

  def violation_statistics(%{field: f}, %{context: %{current_user: user}}) do
    PolicyConstraint.for_user(user)
    |> PolicyConstraint.statistics(f)
    |> Console.Repo.all()
    |> ok()
  end

  def violation_statistics(cluster, %{field: f}, _) do
    PolicyConstraint.for_cluster(cluster.id)
    |> PolicyConstraint.statistics(f)
    |> Console.Repo.all()
    |> ok()
  end

  def vulnerability_statistics(args, %{context: %{current_user: user}}) do
    VulnerabilityReport.for_user(user)
    |> maybe_search(VulnerabilityReport, args)
    |> vuln_filters(args)
    |> VulnerabilityReport.grades()
    |> Console.Repo.all()
    |> ok()
  end

  def cluster_vuln_aggregate(%{grade: grade}, %{context: %{current_user: user}}) do
    VulnerabilityReport.aggregate(user, grade)
    |> Console.Repo.all()
    |> ok()
  end

  def fetch_constraint(%{ref: %{name: name, kind: kind}, cluster_id: cluster_id}, _, _) do
    path = Kube.Client.Base.path("constraints.gatekeeper.sh", "v1beta1", String.downcase(kind), nil, name)
    with %Cluster{} = cluster <- Clusters.get_cluster(cluster_id),
         _ <- save_kubeconfig(cluster),
         {:ok, res} <- Kube.Client.raw(path),
         {g, v, k, _, _} <- Kube.Utils.identifier(res),
      do: {:ok, %{raw: res, kind: k, group: g, version: v, metadata: Kube.Utils.raw_meta(res)}}
  end
  def fetch_constraint(_, _, _), do: {:ok, nil}

  def upsert_policy_constraints(%{constraints: constraints}, %{context: %{cluster: cluster}}),
    do: Policy.upsert_constraints(constraints, cluster)

  def upsert_vulnerabilities(%{vulnerabilities: vulns}, %{context: %{cluster: cluster}}),
    do: Policy.upsert_vulnerabilities(vulns, cluster)

  def upsert_compliance_report_generator(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Policy.upsert_compliance_report_generator(attrs, user)

  def delete_compliance_report_generator(%{id: id}, %{context: %{current_user: user}}),
    do: Policy.delete_compliance_report_generator(id, user)

  def create_policy(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Policy.create_policy(attrs, user)

  def update_policy(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Policy.update_policy(attrs, id, user)

  def delete_policy(%{id: id}, %{context: %{current_user: user}}),
    do: Policy.delete_policy(id, user)

  def create_binding_policy(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Policy.create_binding_policy(attrs, user)

  def update_binding_policy(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Policy.update_binding_policy(attrs, id, user)

  def delete_binding_policy(%{id: id}, %{context: %{current_user: user}}),
    do: Policy.delete_binding_policy(id, user)

  defp policy_filters(query, args) do
    Enum.reduce(args, query, fn
      {:project_id, project_id}, q when is_binary(project_id) -> PolicySchema.for_project(q, project_id)
      _, q -> q
    end)
  end

  defp apply_filters(query, args) do
    Enum.reduce(args, query, fn
      {:namespace, ns}, q -> PolicyConstraint.for_namespace(q, ns)
      {:kind, k}, q -> PolicyConstraint.for_kind(q, k)
      {:kinds, ks}, q -> PolicyConstraint.for_kinds(q, ks)
      {:violated, v}, q -> PolicyConstraint.with_violations(q, v)
      {:namespaces, ns}, q ->
        PolicyConstraint.for_namespaces(q, Enum.filter(ns, & &1), Enum.any?(ns, &is_nil/1))
      {:clusters, ids}, q -> PolicyConstraint.for_clusters(q, ids)
      _, q -> q
    end)
  end

  defp vuln_filters(query, args) do
    Enum.reduce(args, query, fn
      {:clusters, [_ | _] = ids}, q -> VulnerabilityReport.for_clusters(q, ids)
      {:grade, g}, q when not is_nil(g) -> VulnerabilityReport.for_grade(q, g)
      {:namespaces, [_ | _] = ns}, q -> VulnerabilityReport.for_namespaces(q, ns)
      _, q -> q
    end)
  end
end
