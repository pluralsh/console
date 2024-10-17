defmodule Console.Repo.Migrations.AddInsightSummary do
  use Ecto.Migration

  def change do
    alter table(:ai_insights) do
      add :summary, :binary
    end
  end
end
