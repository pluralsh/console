defmodule Console.Repo.Migrations.AddIssuesWorkbenchIndex do
  use Ecto.Migration

  def change do
    create index(:issues, [:workbench_id])
  end
end
