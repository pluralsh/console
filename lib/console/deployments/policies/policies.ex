defmodule Console.Deployments.Policies do
  use Piazza.Policy
  import Console.Deployments.Policies.Rbac, only: [rbac: 3]
  alias Console.Schema.{User, Cluster, Service}

  def can?(%User{} = user, %Service{} = svc, :secrets),
    do: can?(user, svc, :write)
  def can?(%Cluster{id: id}, %Service{cluster_id: id}, :secrets), do: :pass

  def can?(_, %Cluster{deleted_at: del}, :write) when not is_nil(del),
    do: {:error, "cluster deleting"}
  def can?(_, %Service{deleted_at: del}, :write) when not is_nil(del),
    do: {:error, "service deleting"}

  def can?(%User{roles: %{admin: true}}, _, _), do: :pass

  def can?(user, %Ecto.Changeset{} = cs, action),
    do: can?(user, apply_changes(cs), action)

  def can?(%User{} = user, resource, action),
    do: rbac(resource, user, action)

  def can?(_, _, _), do: {:error, :forbidden}
end
