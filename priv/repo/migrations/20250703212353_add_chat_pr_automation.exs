defmodule Console.Repo.Migrations.AddChatPrAutomation do
  use Ecto.Migration

  def change do
    alter table(:chats) do
      add :pr_automation_id, references(:pr_automations, on_delete: :delete_all, type: :uuid)
    end
  end
end
