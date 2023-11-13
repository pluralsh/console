defmodule Console.Repo.Migrations.AddServiceStatusRollup do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :component_status, :string
    end
  end
end
