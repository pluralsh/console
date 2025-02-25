defmodule Console.Deployments.BootstrapPolicies do
  use Piazza.Policy
  alias Console.Schema.{User, BootstrapToken, Project, Cluster, ClusterRegistration, ClusterISOImage}

  def can?(%User{id: id, bootstrap: %BootstrapToken{project_id: pid}}, %ClusterISOImage{creator_id: id, project_id: pid}, _), do: :pass

  def can?(%User{id: id}, %ClusterRegistration{creator_id: id}, _), do: :pass

  def can?(%User{bootstrap: %BootstrapToken{project_id: id}}, %Project{id: id}, :read), do: :pass

  def can?(%User{bootstrap: %BootstrapToken{project_id: id}}, %Cluster{project_id: id}, action)
    when action in ~w(create read token)a, do: :pass

  def can?(user, %Ecto.Changeset{} = cs, action),
    do: can?(user, apply_changes(cs), action)

  def can?(_, _, _), do: {:error, :forbidden}
end
