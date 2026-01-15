defmodule Console.Repo.Migrations.AddStackRunDeletedState do
  use Ecto.Migration

  def change do
    alter table(:stack_runs) do
      add :destroy, :boolean, default: false
    end
  end
end
