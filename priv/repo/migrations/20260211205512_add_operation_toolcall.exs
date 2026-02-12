defmodule Console.Repo.Migrations.AddOperationToolcall do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_activities) do
      add :tool_call, :map
    end
  end
end
