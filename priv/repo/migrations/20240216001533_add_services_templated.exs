defmodule Console.Repo.Migrations.AddServicesTemplated do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :templated, :boolean, default: true, null: false
    end
  end
end
