defmodule Console.Services.Rbac do
  alias Console.Schema.{Role, User, BootstrapToken}

  @local_cache Console.conf(:local_cache)
  @bindings [:role_bindings, :group_role_bindings, :groups]

  def preload(user) do
    Console.Repo.preload(user, [role_bindings: :role, group_role_bindings: :role])
  end

  @doc """
  Like `preload/1`, but reuses a user's bindings for up to a minute on this node, so
  authenticating each request doesn't requery them. Role and group membership changes
  can take that long to reach a user's requests.
  """
  @spec cached_preload(User.t | nil) :: User.t | nil
  def cached_preload(%User{id: id} = user) do
    Console.Cache.fetch_or_store(@local_cache, {:rbac_bindings, id}, fn ->
      preload(user)
      |> Map.take(@bindings)
    end, ttl: :timer.minutes(1))
    |> then(&Map.merge(user, &1))
  end
  def cached_preload(nil), do: nil

  def allow(%User{bootstrap: %BootstrapToken{}}, _, _), do: {:error, :forbidden}
  def allow(%User{roles: %{admin: true}}, _, _), do: :ok
  def allow(%User{} = user, repository, action) do
    case validate(user, repository, action) do
      true -> :ok
      false -> {:error, :forbidden}
    end
  end

  def validate(%User{} = user, repository, action) do
    user
    |> preload()
    |> User.roles()
    |> validate_roles(repository, action)
  end

  defp validate_roles(roles, repository, action) do
    roles
    |> Enum.filter(&matches_repository?(&1, repository))
    |> Enum.any?(&permits_action?(&1, action))
  end

  defp matches_repository?(%Role{repositories: repos}, repository) do
    repos
    |> Enum.map(& "^#{String.replace(&1, "*", ".*")}$" |> Regex.compile!())
    |> Enum.any?(&Regex.match?(&1, repository))
  end

  defp permits_action?(%Role{permissions: %Role.Permissions{} = perms}, action), do: Map.get(perms, action)
end
