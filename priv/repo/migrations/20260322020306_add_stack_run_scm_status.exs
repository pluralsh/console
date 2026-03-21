defmodule Console.Repo.Migrations.AddStackRunScmStatus do
  use Ecto.Migration

  def change do
    alter table(:stack_runs) do
      add :scm_state, :map
    end
  end
end
