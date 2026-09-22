defmodule Console.AI.Provider.TokenExchange.Assertion do
  use Joken.Config

  @ttl 5 * 60

  def mint(client_id, audience, private_key, key_id) do
    with {:ok, claims} <-
           generate_claims(%{
             "iss" => client_id,
             "sub" => client_id,
             "aud" => audience,
             "jti" => Ecto.UUID.generate()
           }),
         {:ok, token, _} <- encode_and_sign(claims, signer(private_key, key_id)),
      do: {:ok, token}
  end

  def token_config(), do: default_claims(default_exp: @ttl)

  defp signer(private_key, key_id) when is_binary(key_id) and key_id != "",
    do: Joken.Signer.create("RS256", %{"pem" => private_key}, %{"kid" => key_id})

  defp signer(private_key, _),
    do: Joken.Signer.create("RS256", %{"pem" => private_key})
end
