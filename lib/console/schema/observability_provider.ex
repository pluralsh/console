defmodule Console.Schema.ObservabilityProvider do
  use Piazza.Ecto.Schema

  defenum Type, datadog: 0, newrelic: 1

  defmodule Credentials do
    use Piazza.Ecto.Schema
    alias Piazza.Ecto.EncryptedString

    embedded_schema do
      embeds_one :datadog, Datadog, on_replace: :update do
        field :api_key, EncryptedString
        field :app_key, EncryptedString
      end

      embeds_one :newrelic, NewRelic, on_replace: :update do
        field :api_key, EncryptedString
      end
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, [])
      |> cast_embed(:datadog, with: &datadog_changeset/2)
      |> cast_embed(:newrelic, with: &newrelic_changeset/2)
    end

    defp datadog_changeset(model, attrs), do: cast(model, attrs, ~w(api_key app_key)a)
    defp newrelic_changeset(model, attrs), do: cast(model, attrs, ~w(api_key)a)
  end

  schema "observability_providers" do
    field :type, Type
    field :name, :string

    embeds_one :credentials, Credentials, on_replace: :update

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(o in query, order_by: ^order)
  end

  @valid ~w(type name)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:credentials)
    |> unique_constraint(:name)
    |> validate_required([:type, :name, :credentials])
  end
end
