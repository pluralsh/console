defmodule Console.Schema.NotificationSink do
  use Piazza.Ecto.Schema
  alias Console.Schema.{AppNotification, PolicyBinding}

  defenum Type, slack: 0, teams: 1, plural: 2

  schema "notification_sinks" do
    field :name, :string
    field :type, Type

    embeds_one :configuration, Configuration, on_replace: :update do
      embeds_one :slack, SlackConfiguration, on_replace: :update do
        field :url, :string
      end

      embeds_one :teams, TeamsConfiguration, on_replace: :update do
        field :url, :string
      end

      embeds_one :plural, PluralConfiguration, on_replace: :update do
        field :priority, AppNotification.Priority
        field :urgent,   :boolean
      end
    end

    has_many :notification_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :id

    timestamps()
  end

  def search(query \\ __MODULE__, q) do
    from(ns in query, where: ilike(ns.name, ^"%#{q}%"))
  end

  def for_type(query \\ __MODULE__, type) do
    from(ns in query, where: ns.type == ^type)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(ns in query, order_by: ^order)
  end

  @valid ~w(type name)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_length(:name, max: 255)
    |> cast_assoc(:notification_bindings)
    |> cast_embed(:configuration, with: &config_changeset/2)
    |> validate_required(@valid)
  end

  defp config_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:slack, with: &url_changeset/2)
    |> cast_embed(:teams, with: &url_changeset/2)
    |> cast_embed(:plural, with: &plural_changeset/2)
  end

  defp url_changeset(model, attrs) do
    model
    |> cast(attrs, [:url])
    |> validate_required([:url])
  end

  defp plural_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(priority urgent)a)
  end
end
