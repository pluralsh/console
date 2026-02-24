defmodule Console.Repo.Migrations.AddServiceNowPrGovernanceColumns do
  use Ecto.Migration

  def change do
    alter table(:pr_governance) do
      add :type, :integer, default: 0
    end

    alter table(:scm_connections) do
      add :bitbucket_datacenter, :map
    end

    alter table(:pull_requests) do
      add :governance_poll_at, :utc_datetime_usec
    end

    create index(:pull_requests, [:governance_id])
    create index(:pull_requests, [:governance_poll_at])
    create index(:pull_requests, [:status])
  end
end
