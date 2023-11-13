defmodule Console.Repo.Migrations.DeployTokens do
  use Ecto.Migration

  def change do
    drop unique_index(:deploy_tokens, [:cluster_id, :token])
    create unique_index(:deploy_tokens, [:token])
  end
end
