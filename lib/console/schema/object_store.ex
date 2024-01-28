defmodule Console.Schema.ObjectStore do
  use Piazza.Ecto.Schema
  alias Piazza.Ecto.EncryptedString

  schema "object_stores" do
    field :name, :string

    embeds_one :s3, S3, on_replace: :update do
      field :bucket,        :string
      field :region,        :string
      field :endpoint,      :string
      field :access_key_id, EncryptedString
    end

    embeds_one :gcs, GCS, on_replace: :update do
      field :bucket, :string
      field :region, :string
      field :application_credentials, EncryptedString
    end

    embeds_one :azure, Azure, on_replace: :update do
      field :storage_account, :string
      field :container,       :string
      field :subscription_id, :string
      field :tenant_id,       :string
      field :client_id,       :string
      field :client_secret,   EncryptedString
    end

    timestamps()
  end

  @valid ~w(name)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:s3, with: &s3_changeset/2)
    |> cast_embed(:gcs, with: &gcs_changeset/2)
    |> cast_embed(:azure, with: &azure_changeset/2)
  end

  def s3_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(bucket region endpoint access_key_id secret_access_key)a)
    |> validate_required(~w(bucket access_key_id secret_access_key)a)
  end

  def gcs_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(bucket region application_credentials)a)
    |> validate_required(~w(bucket region application_credentials)a)
  end

  def azure_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(container storage_account subscription_id tenant_id client_id client_secret)a)
    |> validate_required(~w(container storage_account subscription_id tenant_id client_id client_secret)a)
  end
end
