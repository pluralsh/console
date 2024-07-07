defmodule Console.Repo.Migrations.AddStackVariables do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :variables, :map
    end

    alter table(:stack_runs) do
      add :variables, :map
    end

    alter table(:services) do
      add :parent_id, references(:services, type: :uuid, on_delete: :nilify_all)
    end
  end
end
