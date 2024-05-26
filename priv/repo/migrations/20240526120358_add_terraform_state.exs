defmodule Console.Repo.Migrations.AddTerraformState do
  use Ecto.Migration

  def change do
    create table(:terraform_states, primary_key: false) do
      add :id,       :uuid, primary_key: true
      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)
      add :state,    :binary
      add :lock,     :map

      timestamps()
    end

    alter table(:stacks) do
      add :manage_state, :boolean, default: false
    end

    create unique_index(:terraform_states, [:stack_id])
  end
end
