defmodule Console.Repo.Migrations.AddThoughtToolId do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_thoughts) do
      add :tool_id, references(:workbench_tools, type: :uuid, on_delete: :nilify_all)
    end

    create index(:workbench_job_thoughts, [:tool_id])
  end
end
