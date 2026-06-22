defmodule Console.Repo.Migrations.AddCronPrompWebhookConfigs do
  use Ecto.Migration

  def change do
    alter table(:workbench_crons) do
      add :modes, :map
    end

    alter table(:workbench_webhooks) do
      add :modes, :map
    end

    alter table(:workbench_prompts) do
      add :modes, :map
    end

    alter table(:workbench_chatbots) do
      add :modes, :map
    end
  end
end
