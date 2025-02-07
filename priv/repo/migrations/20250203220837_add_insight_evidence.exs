defmodule Console.Repo.Migrations.AddInsightEvidence do
  use Ecto.Migration

  def change do
    create table(:ai_insight_evidence, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :insight_id,      references(:ai_insights, type: :uuid, on_delete: :delete_all)
      add :type,            :integer
      add :logs,            :map
      add :pull_request_id, references(:pull_requests, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:ai_insight_evidence, [:insight_id])
  end
end
