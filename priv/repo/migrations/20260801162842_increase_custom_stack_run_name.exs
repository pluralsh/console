defmodule Console.Repo.Migrations.IncreaseCustomStackRunName do
  use Ecto.Migration

  def change do
    alter table(:custom_stack_runs) do
      modify :name, :string, size: 2048
    end

    alter table(:workbenches) do
      add :budget, :map
    end

    alter table(:pull_requests) do
      add :difficulty, :map
    end
  end
end
