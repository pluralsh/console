defmodule Console.Repo.Migrations.ComplianceReports do
  use Ecto.Migration

  def change do
    create table(:compliance_reports, primary_key: false) do
      add :id,     :binary_id, primary_key: true
      add :name,   :string
      add :sha256, :string

      timestamps()
    end

    create unique_index(:compliance_reports, [:name])
  end
end
