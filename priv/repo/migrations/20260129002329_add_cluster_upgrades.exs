defmodule Console.Repo.Migrations.AddClusterUpgrades do
  use Ecto.Migration

  def change do
    create table(:cluster_upgrades, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :user_id,    references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :runtime_id, references(:agent_runtimes, type: :uuid, on_delete: :delete_all)
      add :prompt,     :binary
      add :version,    :string
      add :status,     :integer

      timestamps()
    end

    create index(:cluster_upgrades, [:cluster_id])
    create index(:cluster_upgrades, [:user_id])

    create table(:cluster_upgrade_steps, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :type,         :integer
      add :upgrade_id,   references(:cluster_upgrades, type: :uuid, on_delete: :delete_all)
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :nilify_all)
      add :name,         :string
      add :prompt,       :binary
      add :status,       :integer
      add :error,        :binary

      timestamps()
    end

    create index(:cluster_upgrade_steps, [:upgrade_id])
    create index(:cluster_upgrade_steps, [:agent_run_id])

    alter table(:clusters) do
      add :current_upgrade_id, references(:cluster_upgrades, type: :uuid, on_delete: :nilify_all)
    end

    create index(:clusters, [:current_upgrade_id])
  end
end
