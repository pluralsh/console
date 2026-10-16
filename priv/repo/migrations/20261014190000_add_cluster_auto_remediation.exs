defmodule Console.Repo.Migrations.AddClusterAutoRemediation do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :remediation_workbench_id, references(:workbenches, type: :uuid, on_delete: :nilify_all)
      add :remediation_min_priority, :integer, default: 3
      add :remediation_window,       :integer, default: 21_600
      add :remediation_max_jobs,     :integer, default: 3
    end

    create index(:clusters, [:remediation_workbench_id])

    alter table(:workbench_jobs) do
      add :cluster_id,     references(:clusters, type: :uuid, on_delete: :nilify_all)
      add :component_key,  :text
      add :insight_sha,    :text
    end

    create index(:workbench_jobs, [:cluster_id, :component_key, :inserted_at])
  end
end
