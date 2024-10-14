defmodule Console.Repo.Migrations.PraChecklist do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :confirmation, :map
    end
  end
end
