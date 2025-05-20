defmodule Console.Repo.Migrations.AddVulnReportUniq do
  use Ecto.Migration

  def change do
    create unique_index(:vulnerability_reports, [:cluster_id, :artifact_url])
    create index(:vulnerability_reports, [:updated_at])
    create index(:policy_constraints, [:updated_at])
  end
end
