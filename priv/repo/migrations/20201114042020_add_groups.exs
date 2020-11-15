defmodule Watchman.Repo.Migrations.AddGroups do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :roles, :map
    end

    create table(:groups, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :name, :string, null: false
      add :description, :string
      add :global, :boolean, default: false

      timestamps()
    end

    create unique_index(:groups, [:name])

    create table(:group_members, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :user_id, references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :group_id, references(:groups, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:group_members, [:group_id])
    create index(:group_members, [:user_id])
    create unique_index(:group_members, [:group_id, :user_id])
  end
end
