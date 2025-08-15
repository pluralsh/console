defmodule Console.Repo.Migrations.AddPolicyIndexes do
  use Ecto.Migration

  def change do
    create index(:projects, [:read_policy_id])
    create index(:projects, [:write_policy_id])
    create index(:catalogs, [:read_policy_id])
    create index(:catalogs, [:write_policy_id])
    create index(:mcp_servers, [:read_policy_id])
    create index(:mcp_servers, [:write_policy_id])
    create index(:flows, [:read_policy_id])
    create index(:flows, [:write_policy_id])
  end
end
