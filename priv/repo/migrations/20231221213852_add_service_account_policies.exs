defmodule Console.Repo.Migrations.AddServiceAccountPolicies do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :service_account,  :boolean, default: false
      add :assume_policy_id, :uuid
    end

    alter table(:access_tokens) do
      add :scopes, :map
    end
  end
end
