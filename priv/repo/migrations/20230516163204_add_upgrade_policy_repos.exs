defmodule Console.Repo.Migrations.AddUpgradePolicyRepos do
  use Ecto.Migration

  def change do
    alter table(:upgrade_policies) do
      add :repositories, {:array, :string}
    end
  end
end
