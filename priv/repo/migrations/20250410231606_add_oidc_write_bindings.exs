defmodule Console.Repo.Migrations.AddOidcWriteBindings do
  use Ecto.Migration

  def change do
    alter table(:oidc_providers) do
      add :write_policy_id, :uuid
    end
  end
end
