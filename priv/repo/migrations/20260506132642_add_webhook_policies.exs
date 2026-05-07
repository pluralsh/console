defmodule Console.Repo.Migrations.AddWebhookPolicies do
  use Ecto.Migration

  def change do
    alter table(:observability_webhooks) do
      add :read_policy_id, :uuid
      add :write_policy_id, :uuid
    end

    create index(:observability_webhooks, [:read_policy_id])
    create index(:observability_webhooks, [:write_policy_id])

    alter table(:issue_webhooks) do
      add :read_policy_id, :uuid
      add :write_policy_id, :uuid
    end

    create index(:issue_webhooks, [:read_policy_id])
    create index(:issue_webhooks, [:write_policy_id])
  end
end
