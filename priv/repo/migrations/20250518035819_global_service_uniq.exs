defmodule Console.Repo.Migrations.GlobalServiceUniq do
  use Ecto.Migration

  def change do
    create unique_index(:global_services, [:name])
  end
end
