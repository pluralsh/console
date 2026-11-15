defmodule Console.Schema.WorkloadIdentityIssuer do
  @moduledoc """
  A per-scope OIDC issuer (`https://<console>/oidc/<scope_type>/<scope_id>`) whose tokens cloud providers federate
  with, eg one per devbox.  Disabled issuers serve no keys and mint nothing.
  """
  use Console.Schema.Base
  alias Console.Schema.WorkloadIdentityKey

  schema "workload_identity_issuers" do
    field :scope_type,  :string
    field :scope_id,    :binary_id
    field :enabled,     :boolean, default: true
    field :disabled_at, :utc_datetime_usec

    has_many :keys, WorkloadIdentityKey, foreign_key: :issuer_id

    timestamps()
  end

  def for_scope(query \\ __MODULE__, scope_type, scope_id) do
    from(i in query, where: i.scope_type == ^scope_type and i.scope_id == ^scope_id)
  end

  def enabled(query \\ __MODULE__) do
    from(i in query, where: i.enabled)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(scope_type scope_id enabled disabled_at)a)
    |> validate_required(~w(scope_type scope_id)a)
    |> validate_format(:scope_type, ~r/^[a-z][a-z0-9-]*$/)
    |> unique_constraint([:scope_type, :scope_id])
  end
end
