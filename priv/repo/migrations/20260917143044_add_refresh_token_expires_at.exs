defmodule Console.Repo.Migrations.AddRefreshTokenExpiresAt do
  use Ecto.Migration

  def change do
    alter table(:refresh_tokens) do
      add :expires_at, :utc_datetime_usec
    end

    create index(:refresh_tokens, [:expires_at])
  end
end
