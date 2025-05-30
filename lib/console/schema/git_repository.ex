defmodule Console.Schema.GitRepository do
  use Piazza.Ecto.Schema
  alias Console.Schema.ScmConnection
  alias Console.Deployments.Git.{Pathing, Utils}

  defenum AuthMethod, basic: 0, ssh: 1
  defenum Health, pullable: 0, failed: 1

  schema "git_repositories" do
    field :url,          :string
    field :auth_method,  AuthMethod
    field :health,       Health
    field :pulled_at,    :utc_datetime_usec
    field :private_key,  Piazza.Ecto.EncryptedString
    field :passphrase,   :string
    field :username,     :string
    field :password,     Piazza.Ecto.EncryptedString
    field :error,        :string
    field :https_path,   :string
    field :url_format,   :string
    field :decrypt,      :boolean

    field :dir,              :string, virtual: true
    field :private_key_file, :string, virtual: true
    field :prev_private_key, :string, virtual: true

    belongs_to :connection, ScmConnection

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :url]) do
    from(g in query, order_by: ^order)
  end

  @valid ~w(url pulled_at private_key connection_id decrypt passphrase username password https_path url_format)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:url, message: "there is already a git repository with this url")
    |> foreign_key_constraint(:id, name: :service_template, match: :prefix, message: "There is a service template attached to an active managed namespace or global service using this repository")
    |> foreign_key_constraint(:id, name: :services, match: :prefix, message: "there is an active service using this repository")
    |> foreign_key_constraint(:id, name: :stacks, match: :prefix, message: "there is an active stack using this repository")
    |> foreign_key_constraint(:connection_id)
    |> validate_format(:url, ~r/((git|ssh|http(s)?)|(git@[\w\.-]+))(:(\/\/)?)([\w\.@\:\/\-~]+)(\.git)(\/)?/, message: "must provide a valid git url")
    |> add_auth_method()
    |> validate_required([:url])
    |> add_https_path()
    |> add_path_format()
    |> normalize_pk()
    |> required()
  end

  def status_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(pulled_at error health)a)
  end

  defp add_auth_method(cs) do
    case get_field(cs, :url) do
      "http" <> _ -> put_change(cs, :auth_method, :basic)
      _ -> put_change(cs, :auth_method, :ssh)
    end
  end

  defp add_https_path(cs) do
    url = get_field(cs, :url)
    put_new_change(cs, :https_path, fn -> Pathing.https_path(url) end)
  end

  defp add_path_format(cs) do
    url = get_field(cs, :url)
    put_new_change(cs, :url_format, fn -> Pathing.path_format(url) end)
  end

  defp normalize_pk(cs) do
    case get_change(cs, :private_key) do
      key when is_binary(key) ->
        put_change(cs, :private_key, Utils.normalize_pk(key))
      _ -> cs
    end
  end

  defp required(cs) do
    case get_field(cs, :auth_method) do
      :ssh -> validate_required(cs, [:private_key])
      _ -> cs
    end
  end
end
