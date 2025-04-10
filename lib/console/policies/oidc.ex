defmodule Console.Policies.OIDC do
  use Piazza.Policy
  import Console.Deployments.Policies.Rbac, only: [rbac: 3]
  alias Console.Schema.{User}

  def can?(%User{roles: %{admin: true}}, _, _), do: :pass

  def can?(%User{} = user, resource, :write),
    do: rbac(resource, user, :write)

  def can?(user, %Ecto.Changeset{} = cs, action),
    do: can?(user, apply_changes(cs), action)

  def can?(_, _, _), do: {:error, :forbidden}
end
