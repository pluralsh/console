defmodule Console.Repo.Migrations.AddRefreshTokens do
  use Ecto.Migration

  def change do
    create table(:refresh_tokens, primary_key: false) do
      add :id,      :uuid, primary_key: true
      add :token,   :string
      add :user_id, references(:watchman_users, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:refresh_tokens, [:token])
    create index(:refresh_tokens, [:user_id])
  end
end
