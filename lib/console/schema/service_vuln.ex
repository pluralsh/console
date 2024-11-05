defmodule Console.Schema.ServiceVuln do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, VulnerabilityReport}

  schema "service_vulns" do
    belongs_to :service, Service
    belongs_to :report,  VulnerabilityReport

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(service_id report_id)a)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:report_id)
  end
end
