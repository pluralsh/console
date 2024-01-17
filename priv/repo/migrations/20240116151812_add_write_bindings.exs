defmodule Console.Repo.Migrations.AddWriteBindings do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :write_policy_id, :uuid
      add :create_policy_id, :uuid
    end

    alter table(:pull_requests) do
      add :notifications_policy_id, :uuid
    end
  end
end
