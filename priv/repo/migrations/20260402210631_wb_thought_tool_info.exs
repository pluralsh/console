defmodule Console.Repo.Migrations.WbThoughtToolInfo do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_thoughts) do
      add :tool_name, :string
      add :tool_args, :map
    end
  end
end
