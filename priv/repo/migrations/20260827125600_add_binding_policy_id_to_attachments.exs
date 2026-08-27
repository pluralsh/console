defmodule Console.Repo.Migrations.AddBindingPolicyIdToAttachments do
  use Ecto.Migration

  def change do
    alter table(:workbench_policies) do
      add :binding_policy_id, references(:binding_policies, type: :uuid, on_delete: :delete_all)
    end

    alter table(:stack_policies) do
      add :binding_policy_id, references(:binding_policies, type: :uuid, on_delete: :delete_all)
    end

    create index(:workbench_policies, [:binding_policy_id])
    create index(:stack_policies, [:binding_policy_id])
  end
end
