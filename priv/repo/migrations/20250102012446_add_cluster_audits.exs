defmodule Console.Repo.Migrations.AddClusterAudits do
  use Ecto.Migration

  def change do
    create table(:cluster_audit_logs, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :actor_id,   references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :method,     :string
      add :path,       :string

      timestamps()
    end

    create index(:cluster_audit_logs, [:cluster_id])
    create index(:cluster_audit_logs, [:cluster_id, :inserted_at])
    create index(:cluster_audit_logs, [:inserted_at])
  end
end
