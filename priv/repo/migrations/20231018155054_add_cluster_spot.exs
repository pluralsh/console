defmodule Console.Repo.Migrations.AddClusterSpot do
  use Ecto.Migration

  def change do
    alter table(:cluster_node_pools) do
      add :spot, :boolean, default: false
    end
  end
end
