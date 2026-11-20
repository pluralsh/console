defmodule Console.Repo.Migrations.ClusterRemediationEmbed do
  use Ecto.Migration

  def up do
    alter table(:clusters) do
      add :remediation, :map
    end

    execute """
    UPDATE clusters
    SET remediation = jsonb_strip_nulls(jsonb_build_object(
      'min_priority', CASE remediation_min_priority
        WHEN 1 THEN 'low'
        WHEN 2 THEN 'medium'
        WHEN 3 THEN 'high'
        WHEN 4 THEN 'critical'
      END,
      'window', remediation_window,
      'max_jobs', remediation_max_jobs
    ))
    WHERE remediation_min_priority IS NOT NULL
       OR remediation_window IS NOT NULL
       OR remediation_max_jobs IS NOT NULL
    """

    alter table(:clusters) do
      remove :remediation_min_priority
      remove :remediation_window
      remove :remediation_max_jobs
    end
  end

  def down do
    alter table(:clusters) do
      add :remediation_min_priority, :integer, default: 3
      add :remediation_window, :integer, default: 21_600
      add :remediation_max_jobs, :integer, default: 3
    end

    execute """
    UPDATE clusters
    SET remediation_min_priority = CASE remediation->>'min_priority'
          WHEN 'low' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'high' THEN 3
          WHEN 'critical' THEN 4
          ELSE 3
        END,
        remediation_window = COALESCE((remediation->>'window')::integer, 21600),
        remediation_max_jobs = COALESCE((remediation->>'max_jobs')::integer, 3)
    """

    alter table(:clusters) do
      remove :remediation
    end
  end
end
