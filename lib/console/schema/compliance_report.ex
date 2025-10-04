defmodule Console.Schema.ComplianceReport do
  use Piazza.Ecto.Schema
  alias Console.Schema.ComplianceReportGenerator

  schema "compliance_reports" do
    field :name, :string
    field :sha256, :string

    belongs_to :generator, ComplianceReportGenerator

    timestamps()
  end

  def name(prefix \\ nil), do: "#{prefix || Console.rand_alphanum(8)}-#{Console.rand_alphanum(8)}"

  def for_generator(query \\ __MODULE__, id) do
    from(r in query, where: r.generator_id == ^id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(r in query, order_by: ^order)
  end

  @valid ~w(name sha256 generator_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:name])
    |> unique_constraint([:name])
    |> validate_length(:name, max: 255)
  end
end
