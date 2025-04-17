defmodule Console.Repo.Migrations.AddJwks do
  use Ecto.Migration

  def change do
    create table(:jwks, primary_key: false) do
      add :id,  :uuid, primary_key: true
      add :jwk, :map

      timestamps()
    end
  end
end
