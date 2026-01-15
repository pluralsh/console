defmodule Console.Repo.Migrations.AiInsightConfigs do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :disable_ai, :boolean, default: false
    end

    alter table(:services) do
      add :force_insight, :boolean
    end
  end
end
