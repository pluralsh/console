defmodule Console.Repo.Migrations.AddWebhookPriority do
  use Ecto.Migration

  def change do
    alter table(:workbench_webhooks) do
      add :priority, :integer, default: 0
    end
  end
end
