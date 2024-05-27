defmodule Console.Repo.Migrations.AddWorkdirToRuns do
  use Ecto.Migration

  def change do
    alter table(:stack_runs) do
      add :workdir,      :string
      add :manage_state, :boolean
    end
  end
end
