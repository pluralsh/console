defmodule Console.Repo.Migrations.AddComplianceReportGenerators do
  use Ecto.Migration

  def change do
    create table(:compliance_report_generators, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string, null: false
      add :read_policy_id,   :uuid, null: false
      add :format,      :integer

      timestamps()
    end

    create unique_index(:compliance_report_generators, [:name])
  end
end
