defmodule Console.Schema.ChatConnection do
  use Console.Schema.Base
  alias Piazza.Ecto.EncryptedString
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{PolicyBinding, User}

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

    field :read_policy_id, :binary_id
    field :write_policy_id, :binary_id

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id

    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

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

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(cc in query,
        left_join: b in PolicyBinding,
        on: b.policy_id == cc.read_policy_id or b.policy_id == cc.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  @valid ~w(name type)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_embed(:configuration, with: &configuration_changeset/2)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
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
