defmodule Console.Repo.Migrations.AddVulnReportUniq do
  use Ecto.Migration

  def change do
    Console.Repo.delete_all(Console.Schema.VulnerabilityReport)

    flush()

    create unique_index(:vulnerability_reports, [:cluster_id, :artifact_url])
    create index(:vulnerability_reports, [:updated_at])
    create index(:policy_constraints, [:updated_at])
  end
end
