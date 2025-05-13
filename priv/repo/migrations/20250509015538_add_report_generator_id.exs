defmodule Console.Repo.Migrations.AddReportGeneratorId do
  use Ecto.Migration

  def change do
    alter table(:compliance_reports) do
      add :generator_id, references(:compliance_report_generators, type: :uuid, on_delete: :delete_all)
    end

    create index(:compliance_reports, [:generator_id])
  end
end
