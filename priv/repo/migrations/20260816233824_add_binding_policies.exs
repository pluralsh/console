defmodule Console.Repo.Migrations.AddBindingPolicies do
  use Ecto.Migration

  def change do
    alter table(:policies) do
      add :type, :integer, default: 0
    end

    create table(:binding_policies, primary_key: false) do
      add :id,             :uuid, primary_key: true
      add :policy_id,      references(:policies, type: :uuid, on_delete: :delete_all)
      add :bind_policy_id, references(:policies, type: :uuid, on_delete: :delete_all)
      add :interval,       :string
      add :next_poll_at,   :utc_datetime_usec
      add :type,           :integer, default: 0
      add :matches,        :map

      timestamps()
    end

    create index(:binding_policies, [:policy_id])
    create index(:binding_policies, [:next_poll_at])

    create table(:stack_policies, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :policy_id, references(:policies, type: :uuid, on_delete: :delete_all)
      add :stack_id,  references(:stacks, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:stack_policies, [:policy_id])
    create index(:stack_policies, [:stack_id])
    create unique_index(:stack_policies, [:policy_id, :stack_id])
  end
end
