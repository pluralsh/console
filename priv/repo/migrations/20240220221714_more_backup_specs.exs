defmodule Console.Repo.Migrations.MoreBackupSpecs do
  use Ecto.Migration

  def change do
    alter table(:cluster_backups) do
      add :ttl,        :string
      add :namespaces, :map
      add :resources,  :map
    end
  end
end
