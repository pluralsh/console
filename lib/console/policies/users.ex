defmodule Console.Policies.Users do
  use Piazza.Policy
  alias Console.{Repo, Deployments}
  alias Console.Schema.{User, BootstrapToken, Project}

  def can?(%User{bootstrap: %BootstrapToken{}}, _, _), do: {:error, :forbidden}

  def can?(%User{roles: %{admin: true}}, _, _), do: :pass

  def can?(_, %User{roles_updated: true}, :update), do: {:error, :forbidden}

  def can?(%User{id: id}, %User{id: id}, :update), do: :pass

  def can?(%User{} = user, %BootstrapToken{} = token, _) do
     case Repo.preload(token, [:project]) do
      %{project: %Project{} = proj} -> Deployments.Policies.can?(user, proj, :write)
      _ -> {:error, "only admins or project writers can manage bootstrap tokens"}
     end
  end

  def can?(user, %Ecto.Changeset{} = cs, action),
    do: can?(user, apply_changes(cs), action)

  def can?(_, _, _), do: {:error, :forbidden}
end
