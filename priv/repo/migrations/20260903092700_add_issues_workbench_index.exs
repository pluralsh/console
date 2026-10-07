defmodule Console.Repo.Migrations.AddIssuesWorkbenchIndex do
  use Ecto.Migration

  def change do
    create index(:issues, [:workbench_id])
    create index(:issues, [:provider, :url])
  end
end
