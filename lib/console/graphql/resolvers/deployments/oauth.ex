defmodule Console.GraphQl.Resolvers.Deployments.OAuth do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.OAuth

  def create_oidc_provider(%{type: type, attributes: attrs}, _),
    do: OAuth.create(type, attrs)

  def update_oidc_provider(%{type: type, id: id, attributes: attrs}, _),
    do: OAuth.update(type, id, attrs)

  def delete_oidc_provider(%{type: type, id: id}, _),
    do: OAuth.delete(type, id)
end
