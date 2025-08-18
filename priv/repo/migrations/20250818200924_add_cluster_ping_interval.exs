defmodule Console.Repo.Migrations.AddClusterPingInterval do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :ping_interval, :integer
    end
  end
end
