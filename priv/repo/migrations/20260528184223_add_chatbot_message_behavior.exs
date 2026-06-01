defmodule Console.Repo.Migrations.AddChatbotMessageBehavior do
  use Ecto.Migration

  def change do
    alter table(:workbench_chatbots) do
      add :message_behavior, :integer, default: 0
    end
  end
end
