defmodule Console.Schema.PrGovernance do
  use Piazza.Ecto.Schema
  alias Console.Schema.{ScmConnection}
  alias Piazza.Ecto.EncryptedString

  defenum Type, service_now: 1, webhook: 0

  schema "pr_governance" do
    field :type, Type, default: :webhook
    field :name, :string

    embeds_one :configuration, PrGovernanceConfiguration, on_replace: :update do
      embeds_one :webhook, Webhook, on_replace: :update do
        field :url, :string
      end

      embeds_one :service_now, ServiceNow, on_replace: :update do
        field :url,          :string
        field :change_model, :string
        field :username,     :string
        field :password,     EncryptedString
        field :attributes,   :map
      end
    end

    belongs_to :connection, ScmConnection

    timestamps()
  end

  @valid ~w(name connection_id type)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:configuration, with: &config_changeset/2)
    |> foreign_key_constraint(:connection_id)
    |> unique_constraint(:name)
    |> validate_required(@valid)
  end

  defp config_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:webhook, with: &webhook_changeset/2)
    |> cast_embed(:service_now, with: &service_now_changeset/2)
  end

  defp webhook_changeset(model, attrs) do
    model
    |> cast(attrs, [:url])
    |> validate_required([:url])
  end

  defp service_now_changeset(model, attrs) do
    model
    |> cast(attrs, [:url, :change_model, :username, :password, :attributes])
    |> validate_required([:url, :username, :password])
  end
end
