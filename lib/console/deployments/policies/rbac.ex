defmodule Console.Deployments.Policies.Rbac do
  alias Console.Repo
  alias Console.Deployments.Settings
  alias Console.Schema.{
    Cluster,
    ClusterProvider,
    Service,
    DeploymentSettings,
    GitRepository,
    User,
    GlobalService,
    ProviderCredential,
    Pipeline,
    PipelineGate,
    AgentMigration
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

  def evaluate(%PipelineGate{edge: %{pipeline: %Pipeline{} = pipe}}, %User{} = user, action),
    do: evaluate(pipe, user, action)
  def evaluate(%Pipeline{} = pipe, %User{} = user, action),
    do: recurse(pipe, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%Service{} = svc, %User{} = user, action),
    do: recurse(svc, user, action, & &1.cluster)
  def evaluate(%AgentMigration{}, %User{} = user, action),
    do: recurse(Settings.fetch(), user, action)
  def evaluate(%Cluster{} = cluster, %User{} = user, action),
    do: recurse(cluster, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%ClusterProvider{} = cluster, %User{} = user, action),
    do: recurse(cluster, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%ProviderCredential{} = cred, %User{} = user, action),
    do: recurse(cred, user, action, fn _ -> Settings.fetch() end)
  def evaluate(%GitRepository{}, %User{} = user, action),
    do: recurse(Settings.fetch(), user, action)
  def evaluate(%GlobalService{}, %User{} = user, action),
    do: recurse(Settings.fetch(), user, action)
  def evaluate(%DeploymentSettings{} = settings, %User{} = user, action),
    do: recurse(settings, user, action)
  def evaluate(_, _, _), do: false

  def preload(%PipelineGate{} = gate), do: Repo.preload(gate, [edge: [pipeline: [:read_bindings, :write_bindings]]])
  def preload(%Pipeline{} = pipe), do: Repo.preload(pipe, [:read_bindings, :write_bindings])
  def preload(%Service{} = service),
    do: Repo.preload(service, [:read_bindings, :write_bindings, cluster: [:read_bindings, :write_bindings]])
  def preload(%Cluster{} = cluster),
    do: Repo.preload(cluster, [:read_bindings, :write_bindings])
  def preload(%ClusterProvider{} = cluster),
    do: Repo.preload(cluster, [:read_bindings, :write_bindings])
  def preload(%ProviderCredential{} = cred),
    do: Repo.preload(cred, [provider: [:read_bindings, :write_bindings]])
  def preload(%DeploymentSettings{} = settings),
    do: Repo.preload(settings, [:read_bindings, :write_bindings, :git_bindings, :create_bindings])
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
end
