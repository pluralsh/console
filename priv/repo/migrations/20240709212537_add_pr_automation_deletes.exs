defmodule Console.Repo.Migrations.AddPrAutomationDeletes do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :deletes, :map
    end
  end
end
