defmodule Console.Repo.Migrations.AddServiceStatus do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :status, :integer, default: 0
    end
  end
end
