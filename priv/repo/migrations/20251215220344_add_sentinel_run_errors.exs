defmodule Console.Repo.Migrations.AddSentinelRunErrors do
  use Ecto.Migration

  def change do
    alter table(:service_errors) do
      add :sentinel_run_id, references(:sentinel_runs, type: :uuid, on_delete: :delete_all)
    end

    create index(:service_errors, [:sentinel_run_id])
  end
end
