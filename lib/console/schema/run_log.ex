defmodule Console.Schema.RunLog do
  use Piazza.Ecto.Schema
  alias Console.Schema.RunStep

  @expiry 30

  schema "run_logs" do
    field :logs, :binary

    belongs_to :step, RunStep

    timestamps()
  end

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(days: -@expiry)
    from(l in query, where: l.inserted_at <= ^expiry)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(l in query, order_by: ^order)
  end

  @valid ~w(logs step_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(logs)a)
  end
end
