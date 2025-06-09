defmodule Console.Repo.Migrations.AddCloudConnections do
  use Ecto.Migration

  def change do
    create table(:cloud_connections, primary_key: false) do
      add :id,             :uuid, primary_key: true
      add :name,           :string
      add :provider,       :integer
      add :configuration,  :map
      add :read_policy_id, :uuid

      timestamps()
    end

    create unique_index(:cloud_connections, [:name])
  end
end
