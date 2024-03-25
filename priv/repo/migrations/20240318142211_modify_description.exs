defmodule Console.Repo.Migrations.ModifyDescription do
  use Ecto.Migration

  def change do
    alter table(:policy_constraints) do
      remove :description
    end

    alter table(:policy_constraints) do
      add :description, :binary
    end
  end
end
