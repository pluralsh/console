defmodule Console.Repo.Migrations.AddPrConfigs do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :configuration, :map
    end
  end
end
