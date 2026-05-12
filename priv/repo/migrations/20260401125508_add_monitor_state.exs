defmodule Console.Repo.Migrations.AddMonitorState do
  use Ecto.Migration

  def change do
    alter table(:monitors) do
      add :state, :integer
    end
  end
end
