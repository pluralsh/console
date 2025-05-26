defmodule Console.Repo.Migrations.AddClusterScores do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :health_score, :integer
    end

    alter table(:cluster_insight_components) do
      add :priority, :integer
    end
  end
end
