defmodule Console.Repo.Migrations.AddSshSigningKey do
  use Ecto.Migration

  def change do
    alter table(:scm_connections) do
      add :signing_private_key, :binary
    end

    alter table(:watchman_users) do
      add :signing_private_key, :binary
    end
  end
end
