defmodule Console.Repo.Migrations.UniqueClusterUsageHistory do
  use Ecto.Migration

  def up do
    execute """
    DELETE FROM cluster_usage_history
    WHERE ctid IN (
      SELECT ctid
      FROM (
        SELECT
          ctid,
          row_number() OVER (
            PARTITION BY cluster_id, timestamp
            ORDER BY updated_at DESC NULLS LAST, inserted_at DESC NULLS LAST, id DESC NULLS LAST
          ) AS row_number
        FROM cluster_usage_history
        WHERE cluster_id IS NOT NULL AND timestamp IS NOT NULL
      ) duplicates
      WHERE row_number > 1
    )
    """

    drop_if_exists index(:cluster_usage_history, [:cluster_id, :timestamp])
    create unique_index(:cluster_usage_history, [:cluster_id, :timestamp])
  end

  def down do
    drop_if_exists unique_index(:cluster_usage_history, [:cluster_id, :timestamp])
    create index(:cluster_usage_history, [:cluster_id, :timestamp])
  end
end
