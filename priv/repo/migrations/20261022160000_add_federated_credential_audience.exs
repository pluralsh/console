defmodule Console.Repo.Migrations.AddFederatedCredentialAudience do
  use Ecto.Migration

  def change do
    alter table(:federated_credentials) do
      add :aud, :string
    end
  end
end
