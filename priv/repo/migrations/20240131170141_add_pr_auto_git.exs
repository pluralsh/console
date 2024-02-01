defmodule Console.Repo.Migrations.AddPrAutoGit do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :repository_id, references(:git_repositories, type: :uuid, on_delete: :delete_all)
    end

    alter table(:cluster_backups) do
      add :namespace, :string
      add :garbage_collected, :boolean
    end

    drop unique_index(:cluster_backups, [:name])
    create unique_index(:cluster_backups, [:cluster_id, :namespace, :name])
  end
end
