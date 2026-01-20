defmodule Console.Schema.ChatConnection do
  use Console.Schema.Base
  alias Piazza.Ecto.EncryptedString

  defenum Type,
    slack: 0,
    teams: 1

  schema "chat_connections" do
    field :name, :string
    field :type, Type

    embeds_one :configuration, Configuration, on_replace: :update do
      embeds_one :slack, Slack, on_replace: :update do
        field :app_token, EncryptedString
        field :bot_token, EncryptedString
        field :bot_id,    :string
      end

      embeds_one :teams, Teams, on_replace: :update do
        field :client_id,     :string
        field :client_secret, EncryptedString
      end
    end

    timestamps()
  end

  def ignore_ids(query \\ __MODULE__, ids) do
    from(cc in query, where: cc.id not in ^ids)
  end

  def search(query \\ __MODULE__, q) do
    from(cc in query, where: ilike(cc.name, ^"%#{q}%"))
  end

  def for_type(query \\ __MODULE__, type) do
    from(cc in query, where: cc.type == ^type)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(cc in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:name, :type])
    |> cast_embed(:configuration, with: &configuration_changeset/2)
    |> validate_required([:name, :type, :configuration])
  end

  def configuration_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_embed(:slack, with: &slack_changeset/2)
    |> cast_embed(:teams, with: &teams_changeset/2)
  end

  defp slack_changeset(model, attrs) do
    model
    |> cast(attrs, [:app_token, :bot_token, :bot_id])
  end

  defp teams_changeset(model, attrs) do
    model
    |> cast(attrs, [:client_id, :client_secret])
  end
end
