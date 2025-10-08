defmodule Console.Repo.Migrations.AddSentinelRunJobs do
  use Ecto.Migration

  def change do
    create table(:sentinel_run_jobs, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :check,           :string
      add :status,          :integer
      add :format,          :integer
      add :output,          :binary
      add :cluster_id,      references(:clusters, type: :uuid, on_delete: :delete_all)
      add :sentinel_run_id, references(:sentinel_runs, type: :uuid, on_delete: :delete_all)

      add :job,       :map
      add :reference, :map

      timestamps()
    end

    create index(:sentinel_run_jobs, [:sentinel_run_id])
    create index(:sentinel_run_jobs, [:cluster_id])
  end
end
