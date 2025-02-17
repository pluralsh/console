defmodule Console.Schema.StackViolationCause do
  use Piazza.Ecto.Schema
  alias Console.Schema.{StackPolicyViolation}

  schema "stack_violation_causes" do
    field :resource, :string
    field :start,    :integer
    field :end,      :integer

    embeds_many :lines, Lines, on_replace: :delete do
      field :content, :string
      field :line,    :integer
      field :first,   :boolean
      field :last,    :boolean
    end

    belongs_to :violation, StackPolicyViolation

    timestamps()
  end

  @valid ~w(resource start end violation_id)a
  @required @valid -- [:violation_id]

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:lines, with: &line_changeset/2)
    |> foreign_key_constraint(:violation_id)
    |> validate_required(@required)
  end

  defp line_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(content line first last)a)
    |> validate_required(~w(content line)a)
  end
end
