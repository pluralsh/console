defmodule Console.Deployments.Settings do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  alias Console.{PubSub, Schema}
  alias Console.Commands.Plural
  alias Console.Services.Users
  alias Console.Deployments.{Clusters, Services}
  alias Console.Schema.{DeploymentSettings, User, Project, BootstrapToken}

  @agent_vsn File.read!("AGENT_VERSION") |> String.trim()
  @kube_vsn File.read!("KUBE_VERSION") |> String.trim()
  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.minutes(45)

  @type settings_resp :: {:ok, DeploymentSettings.t} | Console.error
  @type project_resp :: {:ok, Project.t} | Console.error

  @preloads ~w(read_bindings write_bindings git_bindings create_bindings deployer_repository artifact_repository)a

  @spec get_project!(binary) :: Project.t
  def get_project!(id), do: Repo.get!(Project, id)

  @spec get_project_by_name!(binary) :: Project.t
  def get_project_by_name!(name), do: Repo.get_by!(Project, name: name)

  @spec get_project_by_name(binary) :: Project.t | nil
  def get_project_by_name(name), do: Repo.get_by(Project, name: name)

  @doc """
  same as `fetch/0` but caches in the process dict
  """
  @spec cached() :: DeploymentSettings.t | nil
  def cached(), do: Console.Cache.process_cache(:settings, &fetch/0)

  @doc """
  Fetches and caches the global deployment settings object, preloads also fetched along the way
  """
  @spec fetch() :: DeploymentSettings.t | nil
  @decorate cacheable(cache: @cache_adapter, key: :deployment_settings, opts: [ttl: @ttl])
  def fetch(), do: fetch_consistent()

  @doc """
  The latest known k8s version
  """
  @spec kube_vsn() :: binary
  def kube_vsn(), do: @kube_vsn

  @doc """
  The configured compliant kubernetes version, defaults to latest - 1
  """
  @spec compliant_vsn() :: binary
  def compliant_vsn() do
    %{major: maj, minor: min} = Version.parse!("#{kube_vsn()}.0")
    "#{maj}.#{min - 1}"
  end

  @doc """
  The git ref to use for new agents on clusters
  """
  @spec agent_ref() :: binary
  def agent_ref(), do: "refs/tags/agent-#{@agent_vsn}"

  @doc """
  The semver version of the current agent chart
  """
  @spec agent_vsn() :: binary
  def agent_vsn(), do: @agent_vsn

  @doc """
  Local file containing the valid, working agent chart tarball
  """
  @spec agent_chart() :: binary
  def agent_chart(), do: Path.join(:code.priv_dir(:console), "agent-chart.tgz")

  @doc "same as fetch/0 but always reads from db"
  def fetch_consistent() do
    Console.Repo.get_by(DeploymentSettings, name: "global")
    |> Console.Repo.preload(@preloads)
  end

  @doc """
  Fetches the configured global helm values for deployment agents (useful for things like unified pod labeling)
  """
  @spec agent_helm_values() :: binary | nil
  def agent_helm_values() do
    case fetch_consistent() do
      %DeploymentSettings{agent_helm_values: vs} when is_binary(vs) and byte_size(vs) > 0 -> vs
      _ -> nil
    end
  end

  def create_default_project() do
    start_transaction()
    |> add_operation(:project, fn _ ->
      %Project{}
      |> Project.changeset(%{name: "default", description: "initial project created by plural", default: true})
      |> Repo.insert()
    end)
    |> add_operation(:clusters, fn %{project: proj} ->
      Schema.Cluster
      |> Repo.update_all(set: [project_id: proj.id])
      |> ok()
    end)
    |> add_operation(:stacks, fn %{project: proj} ->
      Schema.Stack
      |> Repo.update_all(set: [project_id: proj.id])
      |> ok()
    end)
    |> add_operation(:pipelines, fn %{project: proj} ->
      Schema.Pipeline
      |> Repo.update_all(set: [project_id: proj.id])
      |> ok()
    end)
    |> execute()
  end

  def default_project!(), do: Repo.get_by(Project, default: true)

  def add_project_id(attrs, %User{bootstrap: %BootstrapToken{project_id: pid}}), do: Map.put(attrs, :project_id, pid)
  def add_project_id(attrs, _), do: add_project_id(attrs)

  def add_project_id(%{project_id: id} = attrs) when is_binary(id) and byte_size(id) > 0, do: attrs
  def add_project_id(attrs) do
    proj = default_project!()
    Map.put(attrs, :project_id, proj.id)
  end


  @doc """
  Creates a new project, fails if no perms
  """
  @spec create_project(map, User.t) :: project_resp
  def create_project(attrs, %User{} = user) do
    %Project{}
    |> Project.changeset(attrs)
    |> allow(user, :create)
    |> when_ok(:insert)
  end

  @doc """
  Updates a project in place, fails if no perms
  """
  @spec update_project(map, binary, User.t) :: project_resp
  def update_project(attrs, id, %User{} = user) do
    get_project!(id)
    |> Repo.preload([:read_bindings, :write_bindings])
    |> allow(user, :write)
    |> when_ok(&Project.changeset(&1, attrs))
    |> when_ok(:update)
  end

  @doc """
  It will delete a repository if it's not currently in use
  """
  @spec delete_project(binary, User.t) :: project_resp
  def delete_project(id, %User{} = user) do
    try do
      get_project!(id)
      |> Repo.preload([:read_bindings, :write_bindings])
      |> Project.changeset()
      |> allow(user, :write)
      |> when_ok(:delete)
      |> notify(:delete, user)
    rescue
      # foreign key constraint violated
      _ -> {:error, "could not delete project"}
    end
  end

  @doc """
  modifies rbac settings for this project
  """
  @spec project_rbac(map, binary, User.t) :: project_resp
  def project_rbac(attrs, project_id, %User{} = user) do
    get_project!(project_id)
    |> Repo.preload([:read_bindings, :write_bindings])
    |> allow(user, :write)
    |> when_ok(&Project.rbac_changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  creates an instance of the deployment settings object, only used in init
  """
  @spec create(map) :: settings_resp
  def create(attrs) do
    %DeploymentSettings{name: "global"}
    |> DeploymentSettings.changeset(attrs)
    |> Console.Repo.insert()
  end

  @doc """
  Updates global deployment settings and busts cache
  """
  @spec vector_store_initialized() :: settings_resp
  @decorate cache_evict(cache: @cache_adapter, key: :deployment_settings)
  def vector_store_initialized() do
    fetch_consistent()
    |> Ecto.Changeset.change(%{ai: %{vector_store: %{initialized: true}}})
    |> Repo.update()
  end

  @doc """
  Updates global deployment settings and busts cache
  """
  @spec update(map, User.t) :: settings_resp
  @decorate cache_evict(cache: @cache_adapter, key: :deployment_settings)
  def update(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:auth, fn _ ->
      fetch_consistent()
      |> allow(user, :write)
    end)
    |> add_operation(:update, fn %{auth: auth} ->
      auth
      |> Repo.preload(@preloads)
      |> DeploymentSettings.changeset(attrs)
      |> Repo.update()
    end)
    |> add_operation(:migrations, fn
      %{update: %{helm_changed: h, version_changed: v} = settings} when h == true or v == true ->
        migration_attrs(%{}, settings)
        |> Clusters.create_agent_migration(user)
      %{update: up} -> {:ok, up}
    end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end

  @decorate cache_evict(cache: @cache_adapter, key: :deployment_settings)
  def update(attrs) do
    fetch_consistent()
    |> DeploymentSettings.changeset(attrs)
    |> Repo.update()
  end

  @spec enable(User.t) :: settings_resp
  @decorate cache_evict(cache: @cache_adapter, key: :deployment_settings)
  def enable(%User{} = user) do
    case fetch() do
      %DeploymentSettings{enabled: true} = enabled -> {:ok, enabled}
      settings -> do_enable(settings, user)
    end
  end

  def migrate_agents() do
    vsn = agent_ref()
    case fetch_consistent() do
      %DeploymentSettings{manage_agents: true, agent_version: ^vsn} = settings -> {:ok, settings}
      %DeploymentSettings{manage_agents: true} = settings -> migrate_agents(settings, vsn)
      _ -> {:error, "ignoring agent updates"}
    end
  end

  defp migrate_agents(%DeploymentSettings{} = settings, vsn) do
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}

    start_transaction()
    |> add_operation(:settings, fn _ ->
      DeploymentSettings.changeset(settings, %{agent_version: vsn})
      |> Repo.update()
    end)
    |> add_operation(:migration, fn _ ->
      Clusters.create_agent_migration(%{name: vsn, ref: vsn}, bot)
    end)
    |> execute(extract: :settings)
  end

  defp migration_attrs(attrs, %DeploymentSettings{helm_changed: true, agent_helm_values: vals} = settings) when is_binary(vals) and byte_size(vals) > 0 do
    Map.merge(attrs, %{helm_values: vals})
    |> migration_attrs(%{settings | helm_changed: false})
  end
  defp migration_attrs(attrs, %DeploymentSettings{version_changed: true, agent_version: vsn} = settings) do
    Map.merge(attrs, %{ref: vsn})
    |> migration_attrs(%{settings | version_changed: false})
  end
  defp migration_attrs(attrs, _), do: Map.merge(attrs, %{name: "settings-#{Console.rand_alphanum(10)}"})

  defp do_enable(settings, user) do
    start_transaction()
    |> add_operation(:settings, fn _ ->
      DeploymentSettings.changeset(settings, %{enabled: true})
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:install, fn _ ->
      cluster = Clusters.local_cluster()
      Services.api_url("gql")
      |> Plural.install_cd(cluster.deploy_token)
    end)
    |> execute(extract: :settings)
    |> notify(:update, user)
  end

  defp notify({:ok, %DeploymentSettings{} = settings}, :update, user),
    do: handle_notify(PubSub.DeploymentSettingsUpdated, settings, actor: user)
  defp notify(pass, _, _), do: pass
end
