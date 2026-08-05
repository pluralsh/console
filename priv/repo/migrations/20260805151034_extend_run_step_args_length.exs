defmodule Console.Repo.Migrations.ExtendRunStepArgsLength do
  use Ecto.Migration

  def change do
    alter table(:run_steps) do
      modify :args, {:array, :string}, size: 2048
    end
  end
end
