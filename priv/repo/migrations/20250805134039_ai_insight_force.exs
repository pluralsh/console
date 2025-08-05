defmodule Console.Repo.Migrations.AiInsightForce do
  use Ecto.Migration

  def change do
    alter table(:ai_insights) do
      add :force, :boolean
    end
  end
end
