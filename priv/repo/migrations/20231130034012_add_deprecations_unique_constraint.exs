defmodule Console.Repo.Migrations.AddDeprecationsUniqueConstraint do
  use Console.Migration

  @disable_ddl_transaction true

  def change do
    drop_if_exists index(:api_deprecations, [:component_id])

    if Console.conf(:cockroached) do
      flush()
    end

    create unique_index(:api_deprecations, [:component_id])
  end
end
