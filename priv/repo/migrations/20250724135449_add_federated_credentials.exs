defmodule Console.Repo.Migrations.AddFederatedCredentials do
  use Ecto.Migration

  def change do
    create table(:federated_credentials, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :issuer,      :string
      add :user_id,     references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :claims_like, :map
      add :scopes,      {:array, :string}

      timestamps()
    end

    create index(:federated_credentials, [:issuer])
    create index(:federated_credentials, [:issuer, :user_id])
  end
end
