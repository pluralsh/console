defmodule Console.Repo.Migrations.AddStackRunChecks do
  use Ecto.Migration

  def change do
    alter table(:stack_runs) do
      add :check_id, :string
    end
  end
end
