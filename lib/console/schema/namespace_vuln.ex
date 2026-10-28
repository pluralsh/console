defmodule Console.Schema.NamespaceVuln do
  use Console.Schema.Base
  alias Console.Schema.{VulnerabilityReport}

  schema "namespace_vulns" do
    field :namespace, :string

    belongs_to :report, VulnerabilityReport

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(namespace report_id)a)
    |> foreign_key_constraint(:report_id)
  end
end
