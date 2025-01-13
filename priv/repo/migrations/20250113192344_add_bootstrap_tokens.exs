defmodule Console.Repo.Migrations.AddBootstrapTokens do
  use Ecto.Migration

  def change do
    create table(:bootstrap_tokens, primary_key: false) do
      add :id, :uuid, primary_key: true

      add :token,      :string
      add :project_id, references(:projects, type: :uuid, on_delete: :delete_all)
      add :user_id,    references(:watchman_users, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:bootstrap_tokens, [:token])
  end
end
