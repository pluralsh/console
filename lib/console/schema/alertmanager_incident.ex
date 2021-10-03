defmodule Console.Schema.AlertmanagerIncident do
  use Piazza.Ecto.Schema

  schema "alertmanager_incidents" do
    field :fingerprint, :string
    field :incident_id, :binary_id

    timestamps()
  end

  @valid ~w(fingerprint incident_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:fingerprint)
    |> unique_constraint(:incident_id)
    |> validate_required(@valid)
  end
end
