defmodule Console.Repo.Migrations.AddServiceAccountAllowedScopes do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :allowed_scopes, {:array, :string}
    end
  end
end
