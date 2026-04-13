defmodule Console.Repo.Migrations.AddWbWebhookPrompt do
  use Ecto.Migration

  def change do
    alter table(:workbench_webhooks) do
      add :prompt, :binary
    end
  end
end
