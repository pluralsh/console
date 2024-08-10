defmodule Console.Repo.Migrations.RetypePrLabels do
  use Console.Migration

  @disable_ddl_transaction true

  def change do
    alter table(:pull_requests) do
      remove :labels
    end

    if Console.conf(:cockroached) do
      flush()
    end

    alter table(:pull_requests) do
      add :labels, {:array, :string}
    end
  end
end
