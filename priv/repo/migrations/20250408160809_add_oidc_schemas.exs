defmodule Console.Repo.Migrations.AddOidcSchemas do
  use Ecto.Migration

  def change do
    create table(:oidc_providers, primary_key: false) do
      add :id,                :uuid, primary_key: true
      add :name,              :string
      add :description,       :string
      add :icon,              :string
      add :client_id,         :string
      add :client_secret,     :string
      add :redirect_uris,     {:array, :string}
      add :auth_method,       :integer

      add :bindings_id,       :uuid

      timestamps()
    end

    create unique_index(:oidc_providers, [:client_id])
  end
end
