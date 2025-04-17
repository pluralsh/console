defmodule Console.Repo.Migrations.AddJwksRecords do
  use Ecto.Migration
  alias Console.Schema.JWK

  def change do
    epk = JOSE.JWK.generate_key({:ec, "P-256"})
    {_, map} = JOSE.JWK.to_map(epk)
    Console.Repo.insert!(%JWK{jwk: map})
  end
end
