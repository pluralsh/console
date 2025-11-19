defmodule Console.Repo.Migrations.AddSentinelToGates do
  use Ecto.Migration

  def change do
    alter table(:pipeline_gates) do
      add :sentinel_id, references(:sentinels, type: :uuid, on_delete: :delete_all)
      add :sentinel_run_id, references(:sentinel_runs, type: :uuid, on_delete: :nilify_all)
    end

    create index(:pipeline_gates, [:sentinel_id])
    create index(:pipeline_gates, [:sentinel_run_id])
  end
end
