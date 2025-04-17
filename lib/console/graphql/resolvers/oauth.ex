defmodule Console.GraphQl.Resolvers.OAuth do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.OIDCProvider
  alias Console.Schema.{OIDCProvider}
  alias Console.Services.OIDC

  def list_oidc_providers(args, _) do
    OIDCProvider.ordered()
    |> paginate(args)
  end

  def resolve_oidc_login(%{challenge: challenge}, _) do
    OIDC.get_login(challenge)
    |> oidc_response(:v2)
  end

  def resolve_oidc_consent(%{challenge: challenge}, _) do
    OIDC.get_consent(challenge)
    |> oidc_response(:v2)
  end

  def accept_login(%{challenge: challenge}, %{context: %{current_user: user}}),
    do: OIDC.handle_login(challenge, user)

  def accept_consent(%{challenge: challenge, scopes: scopes}, %{context: %{current_user: user}}),
    do: OIDC.consent(challenge, scopes, user)

  defp oidc_response({:ok, provider}, :v2),
    do: {:ok, Map.take(provider, [:login, :consent])}
  defp oidc_response(error, _), do: error
end
