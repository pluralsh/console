defmodule Console.Repo.Migrations.FixNotifications do
  use Ecto.Migration

  def change do
    alter table(:notifications) do
      modify :title, :string, size: 1000
      modify :description, :string, size: 10_000
    end
  end
end
