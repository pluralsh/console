defmodule Console.Repo.Migrations.AddAiServiceInsights do
  use Ecto.Migration

  def change do
    create table(:ai_insights, primary_key: false) do
      add :id,    :uuid, primary_key: true
      add :sha,   :string
      add :text,  :binary
      add :error, :map

      timestamps()
    end

    alter table(:services) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:service_components) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:stacks) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:stack_runs) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end
  end
end
