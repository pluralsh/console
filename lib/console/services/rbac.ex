defmodule Console.Services.Rbac do
  alias Console.Schema.{Role, User}

  def preload(user) do
    Console.Repo.preload(user, [role_bindings: :role, group_role_bindings: :role])
  end

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
