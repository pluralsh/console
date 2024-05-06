defmodule Console.Repo.Migrations.AddRunMessage do
  use Ecto.Migration

  def change do
    alter table(:stack_runs) do
      add :message, :binary
    end

    alter table(:stacks) do
      add :paused, :boolean, default: false
    end
  end
end
