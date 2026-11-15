defmodule Console.Schema.AgentCredential do
  @moduledoc """
  A user's own coding agent subscription (a Claude setup-token or a Codex `auth.json`/Enterprise access token) that
  their devbox instances may bill against instead of the AI proxy.  One per user and provider.  The secret is
  write-only: it is encrypted at rest and only ever leaves console through `GetInstanceCredentials`.
  """
  use Console.Schema.Base
  alias Console.Schema.{User, DevboxInstance}

  defenum Provider, claude: 0, codex: 1
  defenum Kind, claude_oauth_token: 0, codex_chatgpt_auth: 1, codex_access_token: 2
  defenum Status, valid: 0, invalid: 1, expired: 2

  @max_failures 3

  schema "agent_credentials" do
    field :provider,          Provider
    field :kind,              Kind
    field :label,             :string
    field :secret,            Piazza.Ecto.EncryptedString, redact: true
    field :metadata,          :map
    field :status,            Status, default: :valid
    field :version,           :integer, default: 1
    field :failure_count,     :integer, default: 0
    field :default_billing,   :boolean, default: false
    field :linked_at,         :utc_datetime_usec
    field :expires_at,        :utc_datetime_usec
    field :last_refreshed_at, :utc_datetime_usec
    field :last_used_at,      :utc_datetime_usec
    field :warned_at,         :map
    field :lease_expires_at,  :utc_datetime_usec

    belongs_to :user,         User
    belongs_to :lease_holder, DevboxInstance

    timestamps()
  end

  def max_failures(), do: @max_failures

  @doc "The provider whose agent a credential kind bills"
  def provider(:claude_oauth_token), do: :claude
  def provider(:codex_chatgpt_auth), do: :codex
  def provider(:codex_access_token), do: :codex
  def provider(_), do: nil

  def for_user(query \\ __MODULE__, user_id) do
    from(c in query, where: c.user_id == ^user_id)
  end

  def for_provider(query \\ __MODULE__, provider) do
    from(c in query, where: c.provider == ^provider)
  end

  def for_status(query \\ __MODULE__, status) do
    from(c in query, where: c.status == ^status)
  end

  def expiring_before(query \\ __MODULE__, %DateTime{} = at) do
    from(c in query, where: not is_nil(c.expires_at) and c.expires_at <= ^at)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :provider]) do
    from(c in query, order_by: ^order)
  end

  @valid ~w(provider kind label secret metadata status default_billing linked_at expires_at last_refreshed_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(user_id provider kind secret)a)
    |> validate_length(:label, max: 255)
    |> validate_kind()
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:user_id, :provider], message: "you already have a credential linked for this provider")
  end

  def usage_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(status failure_count last_used_at warned_at)a)
  end

  def lease_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(lease_holder_id lease_expires_at)a)
  end

  @doc "A compare-and-swap refresh: a new secret at the next version"
  def refresh_changeset(%__MODULE__{version: v} = model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(secret metadata expires_at last_refreshed_at)a)
    |> put_change(:version, v + 1)
    |> put_change(:status, :valid)
    |> put_change(:failure_count, 0)
    |> validate_required(~w(secret)a)
  end

  defp validate_kind(cs) do
    case {get_field(cs, :kind), get_field(cs, :provider)} do
      {nil, _} -> cs
      {kind, provider} ->
        case provider(kind) do
          ^provider -> cs
          _ -> add_error(cs, :kind, "#{kind} credentials can't be used for #{provider}")
        end
    end
  end
end
