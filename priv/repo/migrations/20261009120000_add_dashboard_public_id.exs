defmodule Console.Repo.Migrations.AddDashboardPublicId do
  use Ecto.Migration

  def change do
    alter table(:dashboards) do
      add :public_id, :string
    end

    create unique_index(:dashboards, [:public_id])
  end
end
