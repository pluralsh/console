defmodule Console.Repo.Migrations.ExtendRunStepArgsLength do
  use Ecto.Migration

  def change do
    alter table(:run_steps) do
      modify :args, {:array, :text}
    end
  end
end
