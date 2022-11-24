defmodule Console.Repo.Migrations.AddNotificationStatus do
  use Ecto.Migration

  def change do
    alter table(:notifications) do
      add :status, :integer, default: 0
    end
  end
end
