defmodule Console.Schema.GitRepository do
  use Piazza.Ecto.Schema

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

    field :dir,              :string, virtual: true
    field :private_key_file, :string, virtual: true

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :url]) do
    from(g in query, order_by: ^order)
  end

  @valid ~w(url pulled_at private_key passphrase username password)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> add_auth_method()
  end

  def status_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(pulled_at error health)a)
  end

  defp add_auth_method(cs) do
    case get_field(cs, :url) do
      "https" <> _ -> put_change(cs, :auth_method, :basic)
      _ -> put_change(cs, :auth_method, :ssh)
    end
  end
end
