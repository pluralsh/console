defmodule Console.Repo.Migrations.UniqueSentinelRunJobPerCluster do
  use Ecto.Migration

  def up do
    execute """
    DELETE FROM sentinel_run_jobs
    WHERE ctid IN (
      SELECT ctid
      FROM (
        SELECT
          ctid,
          row_number() OVER (
            PARTITION BY sentinel_run_id, "check", cluster_id
            ORDER BY updated_at DESC NULLS LAST, inserted_at DESC NULLS LAST, id DESC NULLS LAST
          ) AS row_number
        FROM sentinel_run_jobs
        WHERE sentinel_run_id IS NOT NULL AND "check" IS NOT NULL AND cluster_id IS NOT NULL
      ) duplicates
      WHERE row_number > 1
    )
    """

    create unique_index(:sentinel_run_jobs, [:sentinel_run_id, :check, :cluster_id],
      name: :sentinel_run_jobs_run_check_cluster_index
    )
  end

  def down do
    drop_if_exists index(:sentinel_run_jobs, [:sentinel_run_id, :check, :cluster_id],
      name: :sentinel_run_jobs_run_check_cluster_index
    )
  end
end
