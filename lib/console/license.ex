defmodule Console.License do
  use Joken.Config

  def signer(pem) do
    Joken.Signer.create("RS256", %{"pem" => pem})
  end

  def token_config do
    default_claims(
      iss: "app.plural.sh",
      default_exp: 60 * 60 * 24 * 35
    )
    |> add_claim("aud", fn -> "plrl:console" end)
  end
end
