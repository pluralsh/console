defmodule Console.Repo.Migrations.AddServiceIndices do
  use Ecto.Migration

  def change do
    create index(:services, [:owner_id])
    create index(:pull_requests, [:stack_id])
    create index(:policy_bindings, [:user_id])
    create index(:policy_bindings, [:group_id])
  end
end
