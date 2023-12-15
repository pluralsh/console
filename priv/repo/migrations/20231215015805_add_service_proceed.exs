defmodule Console.Repo.Migrations.AddServiceProceed do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :proceed, :boolean, default: false
    end
  end
end
