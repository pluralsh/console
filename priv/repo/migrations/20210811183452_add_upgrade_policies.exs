defmodule Console.Repo.Migrations.AddUpgradePolicies do
  use Ecto.Migration

  def change do
    create table(:upgrade_policies, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string, null: false
      add :description, :string
      add :target,      :string
      add :type,        :integer
      add :weight,      :integer

      timestamps()
    end

    create unique_index(:upgrade_policies, [:name])
  end
end
