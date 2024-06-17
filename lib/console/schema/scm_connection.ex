defmodule Console.Schema.ScmConnection do
  use Piazza.Ecto.Schema
  alias Piazza.Ecto.EncryptedString
  import Console.Deployments.Git.Utils

  defenum Type, github: 0, gitlab: 1

  schema "scm_connections" do
    field :name,     :string
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

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(scm in query, order_by: ^order)
  end

  @valid ~w(name type base_url api_url username token signing_private_key)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:github, with: &github_changeset/2)
    |> unique_constraint(:name)
    |> validate_required([:name, :type])
    |> validate_private_key(:signing_private_key)
  end

  defp github_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(app_id installation_id private_key)a)
    |> validate_required(~w(app_id installation_id private_key)a)
    |> validate_private_key(:private_key)
  end
end
