defmodule Console.Repo.Migrations.AddProtectServiceTemplate do
  use Ecto.Migration

  def change do
    alter table(:service_templates) do
      add :protect, :boolean, default: false
    end
  end
end
