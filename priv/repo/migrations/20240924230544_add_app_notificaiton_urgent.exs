defmodule Console.Repo.Migrations.AddAppNotificaitonUrgent do
  use Ecto.Migration

  def change do
    alter table(:app_notifications) do
      add :urgent, :boolean, default: false
    end
  end
end
