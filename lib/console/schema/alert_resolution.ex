defmodule Console.Schema.AlertResolution do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Alert}

  schema "alert_resolutions" do
    field :resolution, :string

    belongs_to :alert, Alert

    timestamps()
  end

  defmodule Mini do
    alias Console.Schema.{AlertResolution, Alert}
    defstruct [:title, :message, :type, :severity, :alert_id, :resolution]

    def new(%{"title" => _} = args) do
      %__MODULE__{
        title: args["title"],
        message: args["message"],
        type: args["type"],
        severity: args["severity"],
        alert_id: args["alert_id"],
        resolution: args["resolution"]
      }
    end

    def new(%AlertResolution{alert: %Alert{} = alert} = res) do
      %__MODULE__{
        title: alert.title,
        message: alert.message,
        type: alert.type,
        severity: alert.severity,
        alert_id: alert.id,
        resolution: res.resolution
      }
    end
  end

  @valid ~w(alert_id resolution)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:alert_id)
    |> unique_constraint(:alert_id)
    |> validate_required([:resolution])
  end
end
