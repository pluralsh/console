defmodule Console.Services.Policies do
  use Console.Services.Base
  use Nebulex.Caching
  alias Console.Schema.{UpgradePolicy, User}
  alias Console.PubSub

  @type upgrade_type :: :deploy | :bounce | :approval

  @ttl :timer.minutes(15)

  @decorate cacheable(cache: Console.Cache, key: :upgrade_policies, opts: [ttl: @ttl])
  def upgrade_policies(), do: Console.Repo.all(UpgradePolicy)

  def get_upgrade_policy!(id), do: Console.Repo.get!(UpgradePolicy, id)

  @decorate cache_evict(cache: Console.Cache, keys: [:upgrade_policies])
  def create_upgrade_policy(attrs, %User{roles: %{admin: true}} = user) do
    %UpgradePolicy{}
    |> UpgradePolicy.changeset(attrs)
    |> Console.Repo.insert()
    |> notify(:create, user)
  end
  def create_upgrade_policy(_, _), do: {:error, :forbidden}

  @decorate cache_evict(cache: Console.Cache, keys: [:upgrade_policies])
  def delete_upgrade_policy(id, %User{roles: %{admin: true}} = user) do
    get_upgrade_policy!(id)
    |> Console.Repo.delete()
    |> notify(:delete, user)
  end
  def delete_upgrade_policy(_, _), do: {:error, :forbidden}

  @doc """
  Determine the default upgrade type for a repository, given all available upgrade policies
  """
  @spec upgrade_type(binary) :: upgrade_type
  def upgrade_type(repository, type \\ :deploy) do
    upgrade_policies()
    |> Enum.filter(&matches?(repository, &1))
    |> Enum.max_by(& &1.weight, fn -> nil end)
    |> case do
      %UpgradePolicy{type: type} -> type
      _ -> resolve_type(type)
    end
  end


  @doc """
  Determines if a repository matches a specific policy
  """
  @spec matches?(binary, UpgradePolicy.t) :: boolean
  def matches?(repository, %UpgradePolicy{repositories: [_ | _] = repos}), do: Enum.member?(repos, repository)
  def matches?(repository, %UpgradePolicy{target: "~" <> target}) do
    Regex.compile!("^#{target}$")
    |> Regex.match?(repository)
  end
  def matches?(repository, %UpgradePolicy{target: target}) do
    Regex.compile!("^#{String.replace(target, "*", ".*")}$")
    |> Regex.match?(repository)
  end

  defp resolve_type(type) when type in ~w(deploy bounce approval dedicated config)a, do: type
  defp resolve_type(type) when type in ~w(deploy bounce approval dedicated config),
    do: String.to_existing_atom(type)
  defp resolve_type(_), do: :deploy

  defp notify({:ok, %UpgradePolicy{} = up}, :create, user),
    do: handle_notify(PubSub.UpgradePolicyCreated, up, actor: user)
  defp notify({:ok, %UpgradePolicy{} = up}, :delete, user),
    do: handle_notify(PubSub.UpgradePolicyDeleted, up, actor: user)
  defp notify(pass, _, _), do: pass
end
