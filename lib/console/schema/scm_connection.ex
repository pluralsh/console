defmodule Console.Schema.ScmConnection do
  use Piazza.Ecto.Schema
  alias Piazza.Ecto.EncryptedString
  import Console.Deployments.Git.Utils

  defenum Type, github: 0, gitlab: 1, bitbucket: 2

  schema "scm_connections" do
    field :name,     :string
    field :default,  :boolean
    field :type,     Type
    field :base_url, :string
    field :api_url,  :string
    field :username, :string
    field :token,    EncryptedString
    field :dir,      :string, virtual: true
    field :author,   :map, virtual: true
    field :branch,   :string, virtual: true

    embeds_one :github, GithubApp, on_replace: :update do
      field :app_id,          :string
      field :installation_id, :string
      field :private_key,     EncryptedString
    end

    field :signing_private_key, EncryptedString

    timestamps()
  end

  def default(query \\ __MODULE__), do: from(scm in query, where: scm.default)

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(scm in query, order_by: ^order)
  end

  @valid ~w(name default type base_url api_url username token signing_private_key)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:github, with: &github_changeset/2)
    |> unique_constraint(:name)
    |> unique_constraint(:default, message: "only one scm connection can be marked default at once")
    |> validate_required([:name, :type])
    |> validate_private_key(:signing_private_key)
    |> validate_credentials()
  end

  defp github_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(app_id installation_id private_key)a)
    |> validate_required(~w(app_id installation_id private_key)a)
    |> validate_private_key(:private_key)
  end

  defp validate_credentials(cs) do
    case {get_field(cs, :token), get_field(cs, :type), get_field(cs, :github)} do
      {nil, :github, %{}} -> cs
      {nil, :github, nil} -> add_error(cs, :token, "Must provide either an access token or github app auth for github SCM connections")
      {nil, type, _} -> add_error(cs, :token, "Must provide an access token for #{type} scm connections")
      _ -> cs
    end
  end
end
