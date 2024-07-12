defmodule Console.Repo.Migrations.CascadeClusterRestores do
  use Ecto.Migration

  def change do
    alter table(:cluster_restores) do
      modify :backup_id, references(:cluster_backups, type: :uuid, on_delete: :delete_all),
        from: references(:cluster_backups, type: :uuid)
    end
  end
end
