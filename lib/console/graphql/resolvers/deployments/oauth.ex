defmodule Console.GraphQl.Resolvers.Deployments.OAuth do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.OAuth
  alias Console.Schema.OIDCProvider

  def list_oidc_providers(args, %{context: %{current_user: user}}) do
    OIDCProvider.ordered()
    |> OIDCProvider.for_user(user)
    |> maybe_search(OIDCProvider, args)
    |> paginate(args)
  end

  def create_oidc_provider(%{type: type, attributes: attrs}, _),
    do: OAuth.create(type, attrs)

  def update_oidc_provider(%{type: type, id: id, attributes: attrs}, _),
    do: OAuth.update(type, id, attrs)

  def delete_oidc_provider(%{type: type, id: id}, _),
    do: OAuth.delete(type, id)
end
