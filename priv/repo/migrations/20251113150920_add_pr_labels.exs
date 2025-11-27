defmodule Console.Repo.Migrations.AddPrLabels do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :labels, {:array, :string}
    end
  end
end
