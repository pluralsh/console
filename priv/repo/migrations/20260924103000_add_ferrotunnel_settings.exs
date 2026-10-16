defmodule Console.Repo.Migrations.AddFerrotunnelSettings do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :ferrotunnel, :map
    end
  end
end
