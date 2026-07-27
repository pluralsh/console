defmodule Console.Repo.Migrations.AddChatbotMessageReplyContext do
  use Ecto.Migration

  def change do
    alter table(:chatbot_messages) do
      add :service_url,     :string
      add :conversation_id, :string
      add :activity_id,     :string
    end
  end
end
