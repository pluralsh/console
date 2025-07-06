defmodule Console.Schema.PrGovernance do
  use Piazza.Ecto.Schema
  alias Console.Schema.{ScmConnection}

  schema "pr_governance" do
    field :name, :string

    embeds_one :configuration, PrGovernanceConfiguration, on_replace: :update do
      embeds_one :webhook, Webhook, on_replace: :update do
        field :url, :string
      end
    end

    belongs_to :connection, ScmConnection

    timestamps()
  end

  @valid ~w(name connection_id)a

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
  end

  defp webhook_changeset(model, attrs) do
    model
    |> cast(attrs, [:url])
    |> validate_required([:url])
  end
end
