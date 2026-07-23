defmodule Console.Repo.Migrations.AddChatbotIdParentId do
  use Ecto.Migration

  def change do
    alter table(:chatbot_messages) do
      add :external_id, :string
      add :external_parent_id, :string
    end

    create index(:chatbot_messages, [:external_id])
    create index(:chatbot_messages, [:external_parent_id])
  end
end
