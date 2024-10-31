defmodule Console.Repo.Migrations.AddInsightChatReference do
  use Ecto.Migration

  def change do
    alter table(:chat_threads) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end
  end
end
