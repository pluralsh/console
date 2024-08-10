defmodule Console.Repo.Migrations.ModifyDescription do
  use Console.Migration

  @disable_ddl_transaction true

  def change do
    alter table(:policy_constraints) do
      remove :description
    end

    if Console.conf(:cockroached) do
      flush()
    end

    alter table(:policy_constraints) do
      add :description, :binary
    end
  end
end
