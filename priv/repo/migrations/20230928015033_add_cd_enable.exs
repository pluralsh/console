defmodule Console.Repo.Migrations.AddCdEnable do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :enabled, :boolean, default: false
    end
  end
end
