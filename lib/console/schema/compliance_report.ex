defmodule Console.Schema.ComplianceReport do
  use Piazza.Ecto.Schema

  schema "compliance_reports" do
    field :name, :string
    field :sha256, :string

    timestamps()
  end

  def name() do
    "#{Console.rand_alphanum(8)}-#{Console.rand_alphanum(8)}"
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(q in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:name, :sha256])
    |> validate_required([:name])
    |> unique_constraint([:name])
  end
end
