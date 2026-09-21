defmodule Console.Repo.Migrations.AddWorkbenchThoughtToolCall do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_thoughts) do
      add :tool_call, :map
    end
  end
end
