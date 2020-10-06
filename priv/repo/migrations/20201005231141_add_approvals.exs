defmodule Watchman.Repo.Migrations.AddApprovals do
  use Ecto.Migration

  def change do
    alter table(:builds) do
      add :approver_id, references(:watchman_users, type: :uuid, on_delete: :nothing)
    end
  end
end
