defmodule Console.Schema.ScmConnection do
  use Piazza.Ecto.Schema
  alias Piazza.Ecto.EncryptedString
  alias Console.Deployments.Git.Utils

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
    |> normalize_pk()
  end

  defp github_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(app_id installation_id private_key)a)
    |> validate_required(~w(app_id installation_id private_key)a)
  end

  defp normalize_pk(cs) do
    case get_change(cs, :signing_private_key) do
      key when is_binary(key) ->
        put_change(cs, :signing_private_key, Utils.normalize_pk(key))
      _ -> cs
    end
  end
end
