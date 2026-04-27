defmodule Console.Schema.WorkbenchOauthClient do
  use Console.Schema.Base
  alias Console.Schema.WorkbenchTool
  alias Piazza.Ecto.EncryptedString

  schema "workbench_oauth_clients" do
    field :tool,              WorkbenchTool.Tool
    field :issuer,            :string
    field :authorization_url, :string
    field :client_id,         :string
    field :client_secret,     EncryptedString

    embeds_one :provider_configuration, ProviderConfiguration, on_replace: :update do
      field :authorization_endpoint,                :string
      field :token_endpoint,                        :string
      field :registration_endpoint,                 :string
      field :revocation_endpoint,                   :string
      field :scopes_supported,                      {:array, :string}
      field :response_types_supported,              {:array, :string}
      field :response_modes_supported,              {:array, :string}
      field :grant_types_supported,                 {:array, :string}
      field :token_endpoint_auth_methods_supported, {:array, :string}
      field :code_challenge_methods_supported,      {:array, :string}
      field :client_id_metadata_supported,          :boolean
    end

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(c in query, order_by: ^order)
  end

  @valid ~w(tool issuer authorization_url client_id client_secret provider_configuration)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:provider_configuration, with: &provider_configuration_changeset/2)
    |> unique_constraint(:tool)
    |> validate_required([:tool, :client_id, :client_secret])
  end

  @provider_configuration_valid ~w(
    authorization_endpoint
    token_endpoint
    registration_endpoint
    revocation_endpoint
    scopes_supported
    response_types_supported
    response_modes_supported
    grant_types_supported
    token_endpoint_auth_methods_supported
    code_challenge_methods_supported
    client_id_metadata_supported
  )a

  defp provider_configuration_changeset(model, attrs) do
    model
    |> cast(attrs, @provider_configuration_valid)
    |> validate_required([:authorization_endpoint, :token_endpoint, :registration_endpoint])
  end
end
