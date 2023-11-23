defmodule Console.Repo.Migrations.AddSelfManaged do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :self_managed, :boolean, default: false
    end
  end
end
