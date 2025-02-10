defmodule Console.Repo.Migrations.AddAlertInsights do
  use Ecto.Migration

  def change do
    alter table(:alerts) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end
  end
end
