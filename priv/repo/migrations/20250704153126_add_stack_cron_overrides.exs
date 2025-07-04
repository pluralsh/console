defmodule Console.Repo.Migrations.AddStackCronOverrides do
  use Ecto.Migration

  def change do
    alter table(:stack_crons) do
      add :overrides, :map
    end
  end
end
