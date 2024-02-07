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
  The git ref to use for new agents on clusters
  """
  @spec agent_ref() :: binary
  def agent_ref(), do: "refs/tags/agent-#{@agent_vsn}"

  @doc "same as fetch/0 but always reads from db"
  def fetch_consistent() do
    Console.Repo.get_by(DeploymentSettings, name: "global")
    |> Console.Repo.preload(@preloads)
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
    fetch_consistent()
    |> Repo.preload(@preloads)
    |> DeploymentSettings.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
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
