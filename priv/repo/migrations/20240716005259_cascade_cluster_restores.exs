defmodule Console.Repo.Migrations.CascadeClusterRestores do
  use Console.Migration

  @disable_ddl_transaction true

  def change do
    drop_if_exists constraint(:cluster_restores, :cluster_restores_backup_id_fkey)
    alter table(:cluster_restores) do
      modify :backup_id, references(:cluster_backups, type: :uuid, on_delete: :delete_all)
    end
  end
end
