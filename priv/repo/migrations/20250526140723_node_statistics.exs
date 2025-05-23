defmodule Console.Repo.Migrations.NodeStatistics do
  use Ecto.Migration

  def change do
    create table(:node_statistics, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :name,         :string
      add :pending_pods, :integer
      add :health,       :integer

      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:node_statistics, [:cluster_id])
    create unique_index(:node_statistics, [:cluster_id, :name])
  end
end
