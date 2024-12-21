defmodule Console.Repo.Migrations.AddStorageCost do
  use Ecto.Migration

  def change do
    alter table(:cluster_usage) do
      add :storage_cost, :float
    end

    alter table(:cluster_namespace_usage) do
      add :storage_cost, :float
    end
  end
end
