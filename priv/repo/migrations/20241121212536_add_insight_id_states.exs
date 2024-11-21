defmodule Console.Repo.Migrations.AddInsightIdStates do
  use Ecto.Migration

  def change do
    alter table(:stack_states) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end
  end
end
