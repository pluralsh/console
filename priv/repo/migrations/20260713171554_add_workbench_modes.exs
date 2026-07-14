defmodule Console.Repo.Migrations.AddWorkbenchModes do
  use Ecto.Migration

  def change do
    alter table(:workbenches) do
      add :modes, :map
    end

    alter table(:workbench_tools) do
      add :approval, :boolean, default: false
    end
  end
end
