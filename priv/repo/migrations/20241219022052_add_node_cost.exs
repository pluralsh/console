defmodule Console.Repo.Migrations.AddNodeCost do
  use Ecto.Migration

  def change do
    alter table(:cluster_usage) do
      add :node_cost,          :float
      add :control_plane_cost, :float
    end
  end
end
