defmodule Console.Deployments.Settings do
  use Nebulex.Caching
  alias Console.Schema.{DeploymentSettings, User}

  @ttl :timer.minutes(45)

  @type settings_resp :: {:ok, DeploymentSettings.t} | Console.error

  @preloads ~w(read_bindings write_bindings git_bindings create_bindings deployer_repository artifact_repository)a

  @doc """
  Fetches and caches the global deployment settings object, preloads also fetched along the way
  """
  @spec fetch() :: DeploymentSettings.t | nil
  @decorate cacheable(cache: Console.Cache, key: :deployment_settings, opts: [ttl: @ttl])
  def fetch() do
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
  @decorate cache_evict(cache: Console.Cache, keys: [:deployment_settings])
  def update(attrs, %User{}) do
    fetch()
    |> DeploymentSettings.changeset(attrs)
    |> Console.Repo.update()
  end
end
