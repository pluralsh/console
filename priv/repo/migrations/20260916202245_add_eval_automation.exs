defmodule Console.Repo.Migrations.AddEvalAutomation do
  use Ecto.Migration

  def change do
    alter table(:workbench_evals) do
      add :automation, :map
    end
  end
end
