defmodule Console.Deployments.Policies.Rbac do
  alias Console.Repo
  alias Console.Deployments.Settings
  alias Console.Schema.{
    Cluster,
    ClusterProvider,
    Service,
    DeploymentSettings,
    GitRepository,
    HelmRepository,
    User,
    GlobalService,
    ProviderCredential,
    Pipeline,
    PipelineGate,
    PipelineContext,
    AgentMigration,
    RuntimeService,
    ManagedNamespace,
    PrAutomation,
    PolicyConstraint,
    PinnedCustomResource,
    Stack,
    StackRun,
    CustomStackRun,
    RunStep,
    Project,
    User,
    SharedSecret,
    Observer,
    Catalog,
    ClusterInsightComponent,
    VulnerabilityReport,
    ClusterRegistration,
    ClusterISOImage,
    Flow,
    McpServer,
    OIDCProvider,
    PreviewEnvironmentTemplate,
    ComplianceReportGenerator,
    ServiceContext,
    CloudConnection
  }

  def globally_readable(query, %User{roles: %{admin: true}}, _), do: query
  def globally_readable(query, %User{} = user, fallback) when is_function(fallback) do
    user = Console.Services.Rbac.preload(user)

    Settings.fetch()
    |> evaluate(user, :read)
    |> case do
      true -> query
      _ -> fallback.(query, user.id, Enum.map(user.groups, & &1.id))
    end
  end

  def rbac(resource, user, action, err \\ "forbidden") do
    case evaluate(resource, user, action) do
      true -> :pass
      false -> {:error, err}
    end
  end

  def evaluate(%PipelineContext{} = ctx, %User{} = user, action),
    do: recurse(ctx, user, action, & &1.pipeline)
  def evaluate(%PipelineGate{} = gate, %User{} = user, action),
    do: recurse(gate, user, action, & &1.edge.pipeline)
  def evaluate(%OIDCProvider{} = oidc, %User{} = user, action),
    do: recurse(oidc, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%Project{} = pipe, %User{} = user, action),
    do: recurse(pipe, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%Pipeline{} = pipe, %User{} = user, action),
    do: recurse(pipe, user, action, & [&1.project, &1.flow])
  def evaluate(%Service{} = svc, %User{} = user, action),
    do: recurse(svc, user, action, & [&1.cluster, &1.flow])
  def evaluate(%RuntimeService{} = svc, %User{} = user, action),
    do: recurse(svc, user, action, & &1.cluster)
  def evaluate(%AgentMigration{}, %User{} = user, action),
    do: recurse(Settings.fetch(), user, action)
  def evaluate(%Cluster{} = cluster, %User{} = user, action),
    do: recurse(cluster, user, action, & &1.project)
  def evaluate(%ClusterProvider{} = cluster, %User{} = user, action),
    do: recurse(cluster, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%ProviderCredential{} = cred, %User{} = user, action),
    do: recurse(cred, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%PrAutomation{} = pr, %User{} = user, action),
    do: recurse(pr, user, action, & [&1.project, &1.catalog])
  def evaluate(%Observer{} = obs, %User{} = user, action),
    do: recurse(obs, user, action, & &1.project)
  def evaluate(%GitRepository{}, %User{} = user, action),
    do: recurse(Settings.fetch(), user, action)
  def evaluate(%HelmRepository{}, %User{} = user, action),
    do: recurse(Settings.fetch(), user, action)
  def evaluate(%ClusterInsightComponent{} = comp, user, action),
    do: recurse(comp, user, action, & &1.cluster)
  def evaluate(%VulnerabilityReport{} = comp, user, action),
    do: recurse(comp, user, action, & &1.cluster)
  def evaluate(%ClusterRegistration{} = reg, user, action),
    do: recurse(reg, user, action, & &1.project)
  def evaluate(%ClusterISOImage{} = reg, user, action),
    do: recurse(reg, user, action, & &1.project)
  def evaluate(%Flow{} = flow, user, action),
    do: recurse(flow, user, action, & &1.project)
  def evaluate(%McpServer{} = mcp, user, action),
    do: recurse(mcp, user, action, & &1.project)
  def evaluate(%ComplianceReportGenerator{} = gen, user, action),
    do: recurse(gen, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%ServiceContext{} = ctx, user, action),
    do: recurse(ctx, user, action, & &1.project)
  def evaluate(%GlobalService{} = global, %User{} = user, action) do
    recurse(global, user, action, fn
      %{project: %Project{} = project} -> project
      _ -> Settings.fetch()
    end)
  end
  def evaluate(%ManagedNamespace{} = ns, %User{} = user, action) do
    recurse(ns, user, action, fn
      %{project: %Project{} = project} -> project
      _ -> Settings.fetch()
    end)
  end
  def evaluate(%DeploymentSettings{} = settings, %User{} = user, action),
    do: recurse(settings, user, action)
  def evaluate(%PolicyConstraint{} = constraint, %User{} = user, action),
    do: recurse(constraint, user, action, & &1.cluster)
  def evaluate(%Stack{} = stack, %User{} = user, action),
    do: recurse(stack, user, action, & &1.project)
  def evaluate(%StackRun{} = run, %User{} = user, action),
    do: recurse(run, user, action, & &1.stack)
  def evaluate(%CustomStackRun{} = run, %User{} = user, action),
    do: recurse(run, user, action, & &1.stack)
  def evaluate(%RunStep{} = step, %User{} = user, action),
    do: recurse(step, user, action, & &1.run)
  def evaluate(%PinnedCustomResource{} = pcr, %User{} = user, action) do
    recurse(pcr, user, action, fn
      %{cluster: %Cluster{} = cluster} -> cluster
      _ -> Settings.fetch()
    end)
  end
  def evaluate(%PreviewEnvironmentTemplate{} = template, %User{} = user, action),
    do: recurse(template, user, action, & &1.flow)
  def evaluate(%Catalog{} = catalog, %User{} = user, action),
    do: recurse(catalog, user, action, & &1.project)
  def evaluate(%User{} = sa, %User{} = user, :assume), do: recurse(sa, user, :assume)
  def evaluate(%SharedSecret{} = share, %User{} = user, :consume), do: recurse(share, user, :notify)
  def evaluate(%CloudConnection{} = conn, %User{} = user, action),
    do: recurse(conn, user, action, fn _ -> Settings.fetch() end)
  def evaluate(l, user, action) when is_list(l), do: Enum.any?(l, &evaluate(&1, user, action))
  def evaluate(_, _, _), do: false

  @bindings [:read_bindings, :write_bindings]
  @top_preloads [:read_bindings, :write_bindings, project: @bindings]
  @stack_preloads [:read_bindings, :write_bindings, project: @bindings, cluster: @bindings]

  def preload(%PipelineContext{} = ctx), do: Repo.preload(ctx, [pipeline: @top_preloads])
  def preload(%PipelineGate{} = gate), do: Repo.preload(gate, [edge: [pipeline: @top_preloads]])
  def preload(%Pipeline{} = pipe), do: Repo.preload(pipe, @top_preloads ++ [flow: @top_preloads])
  def preload(%Service{} = service),
    do: Repo.preload(service, [:read_bindings, :write_bindings, cluster: @top_preloads, flow: @top_preloads])
  def preload(%Cluster{} = cluster),
    do: Repo.preload(cluster, @top_preloads)
  def preload(%Project{} = project),
    do: Repo.preload(project, @bindings)
  def preload(%OIDCProvider{} = oidc),
    do: Repo.preload(oidc, [:write_bindings])
  def preload(%RuntimeService{} = rs),
    do: Repo.preload(rs, [cluster: @top_preloads])
  def preload(%ClusterProvider{} = provider),
    do: Repo.preload(provider, @bindings)
  def preload(%ProviderCredential{} = cred),
    do: Repo.preload(cred, [provider: @bindings])
  def preload(%DeploymentSettings{} = settings),
    do: Repo.preload(settings, [:read_bindings, :write_bindings, :git_bindings, :create_bindings])
  def preload(%PrAutomation{} = pr),
    do: Repo.preload(pr, [:write_bindings, :create_bindings, catalog: @top_preloads, project: @bindings])
  def preload(%Catalog{} = pr),
    do: Repo.preload(pr, [:write_bindings, :create_bindings, :read_bindings, project: @bindings])
  def preload(%Observer{} = obs),
    do: Repo.preload(obs, [project: @bindings])
  def preload(%Flow{} = flow),
    do: Repo.preload(flow, @top_preloads)
  def preload(%McpServer{} = mcp),
    do: Repo.preload(mcp, @top_preloads)
  def preload(%PolicyConstraint{} = pr),
    do: Repo.preload(pr, [cluster: @top_preloads])
  def preload(%PinnedCustomResource{} = pcr),
    do: Repo.preload(pcr, [cluster: @top_preloads])
  def preload(%Stack{} = stack),
    do: Repo.preload(stack, @stack_preloads)
  def preload(%StackRun{} = pcr),
    do: Repo.preload(pcr, [stack: @stack_preloads])
  def preload(%GlobalService{} = global),
    do: Repo.preload(global, [project: @bindings])
  def preload(%ClusterRegistration{} = reg),
    do: Repo.preload(reg, [project: @bindings])
  def preload(%ClusterISOImage{} = reg),
    do: Repo.preload(reg, [project: @bindings])
  def preload(%ManagedNamespace{} = ns),
    do: Repo.preload(ns, [project: @bindings])
  def preload(%CustomStackRun{} = pcr),
    do: Repo.preload(pcr, [stack: @stack_preloads])
  def preload(%ClusterInsightComponent{} = comp),
    do: Repo.preload(comp, [cluster: @top_preloads])
  def preload(%VulnerabilityReport{} = comp),
    do: Repo.preload(comp, [cluster: @top_preloads])
  def preload(%RunStep{} = pcr), do: Repo.preload(pcr, run: [stack: @stack_preloads])
  def preload(%User{} = user), do: Repo.preload(user, [:assume_bindings])
  def preload(%SharedSecret{} = share), do: Repo.preload(share, [:notification_bindings])
  def preload(%PreviewEnvironmentTemplate{} = template),
    do: Repo.preload(template, [flow: @top_preloads])
  def preload(%ComplianceReportGenerator{} = gen),
    do: Repo.preload(gen, [:read_bindings])
  def preload(%ServiceContext{} = ctx),
    do: Repo.preload(ctx, [project: @bindings])
  def preload(%CloudConnection{} = conn),
    do: Repo.preload(conn, [:read_bindings])
  def preload(pass), do: pass

  defp recurse(resource, user, action, func \\ fn _ -> nil end)
  defp recurse(%{} = resource, user, action, next) do
    resource = preload(resource)

    bindings(resource, action)
    |> has_binding?(user)
    |> case do
      true -> true
      _ -> evaluate(next.(resource), user, action)
    end
  end
  defp recurse(_, _, _, _), do: false

  defp has_binding?([_ | _] = bindings, %User{id: id} = user) do
    users = Enum.filter(bindings, & &1.user_id) |> MapSet.new(& &1.user_id)
    groups = Enum.filter(bindings, & &1.group_id) |> MapSet.new(& &1.group_id)
    with false <- MapSet.member?(users, id),
      do: has_group?(groups, user)
  end
  defp has_binding?(_, _), do: false

  defp has_group?(groups, %User{groups: [_ | _] = ugroups}), do: Enum.any?(ugroups, &MapSet.member?(groups, &1.id))
  defp has_group?(_, _), do: false

  defp bindings(resource, action) do
    case binding_key(action) do
      l when is_list(l) -> Enum.flat_map(l, & Map.get(resource, &1) || [])
      k -> Map.get(resource, k)
    end
  end

  defp binding_key(:read), do: [:read_bindings, :write_bindings]
  defp binding_key(:write), do: :write_bindings
  defp binding_key(:git), do: :git_bindings
  defp binding_key(:create), do: [:create_bindings, :write_bindings]
  defp binding_key(:assume), do: :assume_bindings
  defp binding_key(:notify), do: :notification_bindings
  defp binding_key(_), do: []
end
