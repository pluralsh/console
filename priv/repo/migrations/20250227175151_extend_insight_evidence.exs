defmodule Console.Repo.Migrations.ExtendInsightEvidence do
  use Ecto.Migration

  def change do
    alter table(:ai_insight_evidence) do
      add :alert,        :map
      add :pull_request, :map
    end
  end
end
