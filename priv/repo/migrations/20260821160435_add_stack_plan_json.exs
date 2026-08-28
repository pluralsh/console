defmodule Console.Repo.Migrations.AddStackPlanJson do
  use Ecto.Migration

  def change do
    alter table(:stack_states) do
      add :plan_json, :map
    end
  end
end
