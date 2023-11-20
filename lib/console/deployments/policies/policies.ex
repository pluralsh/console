defmodule Console.Deployments.Policies do
  use Piazza.Policy
  import Console.Deployments.Policies.Rbac, only: [rbac: 3]
  alias Console.Deployments.Services
  alias Console.Schema.{User, Cluster, Service, PipelineGate}

  def can?(user, %Ecto.Changeset{} = cs, action),
    do: can?(user, apply_changes(cs), action)

  def can?(user, %{read_bindings: r, write_bindings: w} = resource, :create)
        when (is_list(r) and length(r) > 0) or (is_list(w) and length(w) > 0),
    do: can?(user, Map.merge(resource, %{read_bindings: [], write_bindings: []}), :create)

  def can?(%Cluster{id: id}, %PipelineGate{cluster_id: id}, :update),
    do: :pass
  def can?(_, %PipelineGate{}, :update), do: {:error, "forbidden"}

  def can?(%User{} = user, %PipelineGate{type: :approval} = g, :approve),
    do: can?(user, g, :write)
  def can?(_, %PipelineGate{}, :approve), do: {:error, "only approval gates can be approved"}

  def can?(%User{} = user, %Service{} = svc, :secrets),
    do: can?(user, %{svc | deleted_at: nil}, :write)
  def can?(%Cluster{id: id}, %Service{cluster_id: id}, :secrets), do: :pass
  def can?(%Cluster{id: id}, %Service{cluster_id: id}, :read), do: :pass

  def can?(_, %Cluster{self: true}, :delete), do: {:error, "cannot delete the management cluster"}
  def can?(_, %Cluster{protect: true}, :delete), do: {:error, "this cluster has deletion protection enabled"}
  def can?(_, %Service{protect: true}, :delete), do: {:error, "this service has deletion protection enabled"}
  def can?(_, %Service{name: "deploy-operator"}, :delete),
    do: {:error, "cannot delete the deploy operator"}
  def can?(user, %Service{} = service, :delete) do
    case Services.referenced?(service.id) do
      true -> {:error, "cannot delete a cluster or provider service"}
      _ -> can?(user, %{service | deleted_at: nil}, :write)
    end
  end
  def can?(u, resource, :delete), do: can?(u, %{resource | deleted_at: nil}, :write)
  def can?(_, %Cluster{deleted_at: del}, :write) when not is_nil(del),
    do: {:error, "cluster deleting"}
  def can?(_, %Service{deleted_at: del}, :write) when not is_nil(del),
    do: {:error, "service deleting"}

  def can?(%User{roles: %{admin: true}}, _, _), do: :pass

  def can?(%User{} = user, resource, action),
    do: rbac(resource, user, action)

  def can?(_, _, _), do: {:error, :forbidden}
end
