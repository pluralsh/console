defmodule Console.Deployments.Policy do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.{
    BindingPolicy,
    StackPolicy,
    WorkbenchPolicy,
    Stack,
    Workbench,
    PolicyConstraint,
    ConstraintViolation,
    Cluster,
    VulnerabilityReport,
    Vulnerability,
    Service,
    ComplianceReportGenerator,
    User,
    Project,
    GitRepository,
    StackRun
  }
  alias Console.Deployments.Settings
  alias Console.Deployments.{Stacks, Workbenches}
  alias Console.Services.Users
  alias Console.PubSub

  require Logger

  @type summary_resp :: {:ok, integer} | Console.error
  @type generator_resp :: {:ok, ComplianceReportGenerator.t} | Console.error
  @type policy_resp :: {:ok, Console.Schema.Policy.t} | Console.error
  @type binding_policy_resp :: {:ok, BindingPolicy.t} | Console.error

  def get_policy!(id), do: Repo.get!(Console.Schema.Policy, id)
  def get_policy(id), do: Repo.get(Console.Schema.Policy, id)
  def get_policy_by_name(name), do: Repo.get_by(Console.Schema.Policy, name: name)
  def get_policy_by_name!(name), do: Repo.get_by!(Console.Schema.Policy, name: name)
  def get_binding_policy!(id), do: Repo.get!(BindingPolicy, id)
  def get_binding_policy(id), do: Repo.get(BindingPolicy, id)

  @doc "Creates a project-scoped policy."
  @spec create_policy(map, User.t) :: policy_resp
  def create_policy(attrs, %User{} = user) do
    %Console.Schema.Policy{}
    |> Console.Schema.Policy.changeset(Settings.add_project_id(attrs, user))
    |> allow(user, :write)
    |> when_ok(:insert)
  end

  @doc "Updates a project-scoped policy."
  @spec update_policy(map, binary, User.t) :: policy_resp
  def update_policy(attrs, id, %User{} = user) do
    get_policy!(id)
    |> allow(user, :write)
    |> when_ok(&Console.Schema.Policy.changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update)
  end

  @doc "Deletes a project-scoped policy."
  @spec delete_policy(binary, User.t) :: policy_resp
  def delete_policy(id, %User{} = user) do
    get_policy!(id)
    |> Repo.preload(:workbench_policies)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete)
  end

  @doc "Creates a policy binding. Requires write access to the associated policy."
  @spec create_binding_policy(map, User.t) :: binding_policy_resp
  def create_binding_policy(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:policy, fn _ ->
      %BindingPolicy{}
      |> BindingPolicy.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:insert)
    end)
    |> add_operation(:check, fn %{policy: policy} ->
      case Repo.preload(policy, :bind_policy) do
        %BindingPolicy{bind_policy: %{type: :binding}} = binding ->
          {:ok, binding}
        _ -> {:error, "the binding policy needs to have binding type"}
      end
    end)
    |> execute(extract: :policy)
  end

  @doc "Updates a policy binding. Requires write access to the associated policy."
  @spec update_binding_policy(map, binary, User.t) :: binding_policy_resp
  def update_binding_policy(attrs, id, %User{} = user) do
    get_binding_policy!(id)
    |> allow(user, :write)
    |> when_ok(&BindingPolicy.changeset(&1, attrs))
    |> when_ok(:update)
  end

  @doc "Deletes a policy binding. Requires write access to the associated policy."
  @spec delete_binding_policy(binary, User.t) :: binding_policy_resp
  def delete_binding_policy(id, %User{} = user) do
    get_binding_policy!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  def eval_policy(engine, input, ids, path \\ "data.plrl.wb.admission.result") do
    with {:ok, engine} <- Regolix.set_input(engine, input) do
      Regolix.eval_query(engine, path)
      |> maybe_sample(input, ids)
    end
  end

  @doc "Builds the actor payload used as policy input."
  def actor(%User{id: id, name: name, email: email, groups: groups}) do
    %{
      "id" => id,
      "name" => name,
      "email" => email,
      "groups" => if(is_list(groups), do: Enum.map(groups, & &1.name), else: [])
    }
  end
  def actor(_), do: %{}

  @doc "Builds the stack payload used as policy input."
  def stack(%Stack{name: name} = stack) do
    %{
      "name" => name,
      "project" => stack_project(stack.project),
      "git" => stack_git(stack)
    }
  end
  def stack(_), do: %{}

  @doc "Builds the commit payload used as policy input."
  def commit(%StackRun{} = run) do
    %{
      "sha" => git_field(run.git, :ref),
      "message" => run.message,
      "committer" => run.committer
    }
  end
  def commit(_), do: %{}

  defp stack_project(%Project{id: id, name: name}), do: %{"id" => id, "name" => name}
  defp stack_project(_), do: %{}

  defp stack_git(%Stack{git: git, repository: repo, sha: sha}) do
    %{
      "ref" => git_field(git, :ref),
      "folder" => git_field(git, :folder),
      "sha" => sha,
      "url" => repo_url(repo)
    }
  end

  defp git_field(%{ref: ref}, :ref), do: ref
  defp git_field(%{folder: folder}, :folder), do: folder
  defp git_field(_, _), do: nil

  defp repo_url(%GitRepository{url: url}), do: url
  defp repo_url(_), do: nil

  @doc "Joins deny/approve reason objects into a single persisted string."
  def policy_reason(items, fallback \\ "")
  def policy_reason(items, fallback) when is_list(items) do
    items
    |> Enum.map(fn
      %{"message" => msg} when is_binary(msg) -> msg
      %{"reason" => reason} when is_binary(reason) -> reason
      %{"msg" => msg} when is_binary(msg) -> msg
      other -> inspect(other)
    end)
    |> Enum.join("; ")
    |> case do
      "" -> fallback
      reason -> reason
    end
  end
  def policy_reason(_, fallback), do: fallback

  def evaluate_policy(%Console.Schema.Policy{} = policy, input),
    do: evaluate_policy(policy, input, [])
  def evaluate_policy(%Console.Schema.Policy{} = policy, input, ids) when is_list(ids) do
    with {:ok, engine, path} <- compile_policies(policy.type, [policy]) do
      eval_policy(engine, input, ids, path)
    end
  end

  def evaluate_policy(id, input, %User{} = user),
    do: evaluate_policy(id, input, user, nil)
  def evaluate_policy(id, input, %User{} = user, override)
      when is_binary(override) and byte_size(override) > 0 do
    get_policy(id)
    |> allow(user, :write)
    |> when_ok(fn policy -> evaluate_policy(%{policy | policy: override}, input) end)
  end
  def evaluate_policy(id, input, %User{} = user, _override) do
    get_policy(id)
    |> allow(user, :read)
    |> when_ok(&evaluate_policy(&1, input))
  end

  @workbench_rego Path.expand("../../../priv/policy/wb.rego", __DIR__)
  @binding_rego Path.expand("../../../priv/policy/binding.rego", __DIR__)
  @stack_rego Path.expand("../../../priv/policy/stack.rego", __DIR__)
  @external_resource @workbench_rego
  @external_resource @binding_rego
  @external_resource @stack_rego
  @workbench_policy_base File.read!(@workbench_rego)
  @binding_policy_base File.read!(@binding_rego)
  @stack_policy_base File.read!(@stack_rego)

  def compile_policies(type, policies) when is_list(policies) do
    with {:ok, base, path} <- evaluation_base(type),
         {:ok, engine} <- Regolix.new(),
         {:ok, engine} <- Regolix.add_policy(engine, "plrl.rego", base),
         {:ok, engine} <- add_policies(engine, policies) do
      {:ok, engine, path}
    end
  end

  defp add_policies(engine, policies) do
    Enum.reduce_while(policies, {:ok, engine}, fn %{name: name, policy: policy}, {:ok, eng} ->
      case Regolix.add_policy(eng, name, policy) do
        {:ok, engine} -> {:cont, {:ok, engine}}
        {:error, reason} -> {:halt, {:error, "Failed to add policy #{name}: #{inspect(reason)}"}}
      end
    end)
  end

  defp evaluation_base(:workbench), do: {:ok, @workbench_policy_base, "data.plrl.wb.admission.result"}
  defp evaluation_base(:binding), do: {:ok, @binding_policy_base, "data.plrl.binding.result"}
  defp evaluation_base(:stack), do: {:ok, @stack_policy_base, "data.plrl.stack.result"}
  defp evaluation_base(type), do: {:error, "policy type #{type} cannot be evaluated"}

  def next_binding_poll(%BindingPolicy{} = binding) do
    binding
    |> BindingPolicy.next_poll_changeset(binding.interval)
    |> Repo.update()
  end

  def reconcile(%BindingPolicy{} = binding) do
    binding = Repo.preload(binding, [:bind_policy, :policy])

    targets(binding)
    |> Repo.stream(method: :keyset)
    |> Console.throttle(count: 50, pause: :timer.seconds(1))
    |> Stream.each(&reconcile_binding(binding, &1))
    |> Stream.run()
  end

  def reconcile(%BindingPolicy{type: :workbench} = binding, %Workbench{} = target),
    do: reconcile_target(binding, target)
  def reconcile(%BindingPolicy{type: :stack} = binding, %Stack{} = target),
    do: reconcile_target(binding, target)
  def reconcile(_, _), do: :ok

  defp targets(%BindingPolicy{type: :workbench, policy: %{project_id: project_id}}) do
    Workbench.for_project(project_id)
    |> Workbench.stream()
    |> Workbench.preloaded()
  end

  defp targets(%BindingPolicy{type: :stack, policy: %{project_id: project_id}}) do
    Stack.for_project(project_id)
    |> Stack.stream()
    |> Stack.preloaded([:project])
  end

  defp reconcile_target(binding, %{project_id: project_id} = target) do
    case Repo.preload(binding, [:bind_policy, :policy]) do
      %{policy: %{project_id: ^project_id}} = binding ->
        reconcile_binding(binding, target)
      _ -> :ok
    end
  end

  defp reconcile_binding(%BindingPolicy{} = binding, target) do
    user = bot()
    case evaluate_policy(binding.bind_policy, binding_input(target), [binding.bind_policy_id]) do
      {:ok, %{"bind" => true}} -> attach_binding(binding, target, user)
      {:ok, %{"bind" => false}} -> detach_binding(binding, target, user)
      error -> Logger.error("Failed to evaluate binding policy #{binding.id}: #{inspect(error)}")
    end
  end

  defp binding_input(%Workbench{} = target), do: %{workbench: clean_binding_input(target)}
  defp binding_input(%Stack{} = target), do: %{stack: clean_binding_input(target)}

  defp clean_binding_input(target) do
    target
    |> Map.from_struct()
    |> Console.clean()
  end

  defp attach_binding(%BindingPolicy{} = binding, target, user) do
    case fetch(binding, target) do
      %{} -> :ok
      _ -> reconcile_target(:attach, binding, target, user)
    end
  end

  defp detach_binding(%BindingPolicy{} = binding, target, user) do
    case fetch(binding, target) do
      %{} -> reconcile_target(:detach, binding, target, user)
      _ -> :ok
    end
  end

  defp fetch(%BindingPolicy{policy_id: id}, %Workbench{id: wid}), do: Repo.get_by(WorkbenchPolicy, policy_id: id, workbench_id: wid)
  defp fetch(%BindingPolicy{policy_id: id}, %Stack{id: sid}), do: Repo.get_by(StackPolicy, policy_id: id, stack_id: sid)

  defp reconcile_target(:attach, %BindingPolicy{policy_id: id} = binding, %Workbench{} = wb, user),
    do: Workbenches.create_workbench_policy(%{policy_id: id, matches: BindingPolicy.workbench_matches(binding)}, wb.id, user)
  defp reconcile_target(:attach, %BindingPolicy{} = binding, %Stack{} = stack, user),
    do: Stacks.create_stack_policy(stack_policy_attrs(binding), stack.id, user)
  defp reconcile_target(:detach, %BindingPolicy{policy_id: id}, %Workbench{} = wb, user),
    do: Workbenches.delete_workbench_policy(id, wb.id, user)
  defp reconcile_target(:detach, %BindingPolicy{policy_id: id}, %Stack{} = stack, user),
    do: Stacks.delete_stack_policy(id, stack.id, user)

  defp bot(), do: Users.admin_bot()

  defp stack_policy_attrs(%BindingPolicy{policy_id: id, matches: %{stack: %{type: t}}})
    when not is_nil(t), do: %{policy_id: id, type: t}
  defp stack_policy_attrs(%BindingPolicy{policy_id: id}), do: %{policy_id: id, type: :approval}

  defp maybe_sample({:ok, %{"sample" => s}} = res, input, ids) when is_list(ids) do
    if :rand.uniform() <= Console.clamp(s, 0, 0.5) && !Enum.empty?(ids) do
      %Console.PubSub.PolicySampled{
        ids: ids,
        input: input,
        result: res
      }
      |> Map.put(:source_pid, self())
      |> Console.PubSub.Broadcaster.notify()
    end
    res
  end
  defp maybe_sample(res, _, _), do: res


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
        constraint = case Repo.get_by(PolicyConstraint, cluster_id: id, name: name) do
          %PolicyConstraint{} = constraint -> Repo.preload(constraint, [:violations])
          nil -> %PolicyConstraint{cluster_id: id, updated_at: DateTime.utc_now()}
        end

        constraint
        |> PolicyConstraint.changeset(
          stabilize_violations(attrs, constraint)
          |> truncate_fields(~w(name description)a)
        )
        |> Repo.insert_or_update()
      end)
    end)
    |> execute()
    |> when_ok(&map_size/1)
  end

  defp stabilize_violations(%{violations: [_ | _] = violations} = attrs, [_ | _] = current_violations) do
    lookup = Map.new(current_violations, & {{&1.group, &1.version, &1.kind, &1.namespace, &1.name}, &1})
    violations = Enum.map(violations, fn v ->
      v = truncate_fields(v, ~w(name message)a)
      case lookup[{v[:group], v[:version], v[:kind], v[:namespace], v[:name]}] do
        %ConstraintViolation{id: id} -> Map.put(v, :id, id)
        _ -> v
      end
    end)
    %{attrs | violations: violations}
  end
  defp stabilize_violations(attrs, _), do: attrs

  defp truncate_fields(attrs, fields) do
    Enum.reduce(fields, attrs, fn field, acc ->
      case Map.get(acc, field) do
        value when is_binary(value) and byte_size(value) >= 1_000 ->
          Map.put(acc, field, binary_part(value, 0, 1_000))
        _ -> acc
      end
    end)
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

  def notify({:ok, %Console.Schema.Policy{} = policy}, :update),
    do: handle_notify(PubSub.PolicyUpdated, policy)
  def notify({:ok, %Console.Schema.Policy{} = policy}, :delete),
    do: handle_notify(PubSub.PolicyDeleted, policy)
  def notify(pass, _), do: pass
end
