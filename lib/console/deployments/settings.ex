defmodule Console.Deployments.Settings do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Commands.Plural
  alias Console.Services.Users
  alias Console.Deployments.{Clusters, Services}
  alias Console.Schema.{DeploymentSettings, User}

  @agent_vsn File.read!("AGENT_VERSION")
  @kube_vsn File.read!("KUBE_VERSION")
  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.minutes(45)

  @type settings_resp :: {:ok, DeploymentSettings.t} | Console.error

  @preloads ~w(read_bindings write_bindings git_bindings create_bindings deployer_repository artifact_repository)a

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

  @spec agent_vsn() :: binary
  def agent_vsn(), do: @agent_vsn

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
  @spec update(map, User.t) :: settings_resp
  @decorate cache_evict(cache: @cache_adapter, key: :deployment_settings)
  def update(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:update, fn _ ->
      fetch_consistent()
      |> Repo.preload(@preloads)
      |> DeploymentSettings.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
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
