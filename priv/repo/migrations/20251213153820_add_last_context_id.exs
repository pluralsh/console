defmodule Console.Repo.Migrations.AddLastContextId do
  use Ecto.Migration

  def change do
    alter table(:pipeline_gates) do
      add :last_context_id, references(:pipeline_contexts, type: :uuid, on_delete: :nilify_all)
    end
  end
end
