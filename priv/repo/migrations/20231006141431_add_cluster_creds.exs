defmodule Console.Repo.Migrations.AddClusterCreds do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :credential_id, references(:provider_credentials, type: :uuid)
    end

    create unique_index(:clusters, [:name, :provider_id, :credential_id])
  end
end
