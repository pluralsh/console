defmodule Console.Repo.Migrations.AddWorkbenchJobKnowledgeUpdated do
  use Ecto.Migration

  def change do
    alter table(:workbench_jobs) do
      add :knowledge_updated_at, :utc_datetime_usec
    end
  end
end
