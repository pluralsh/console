defmodule Console.Schema.FederatedCredential do
  use Piazza.Ecto.Schema
  alias Console.Schema.User

  schema "federated_credentials" do
    field :issuer, :string
    field :claims_like, :map
    field :scopes, {:array, :string}

    belongs_to :user, User

    timestamps()
  end

  def for_issuer(query \\ __MODULE__, issuer) do
    from(f in query, where: f.issuer == ^issuer)
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(f in query, where: f.user_id == ^user_id)
  end

  def allow?(%__MODULE__{claims_like: %{} = conditions}, %{} = claims) do
    Enum.all?(conditions, fn {k, v} ->
      with {:ok, val} <- Map.fetch(claims, k),
           {:ok, re} <- Regex.compile(v) do
        Regex.match?(re, val)
      else
        _ -> false
      end
    end)
  end
  def allow?(_, _), do: false

  @valid ~w(issuer claims_like scopes user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> validate_required(@valid)
    |> validate_claims()
  end

  defp validate_claims(cs) do
    case get_change(cs, :claims_like) do
      claims when map_size(claims) > 0 ->
        Enum.reduce_while(claims, cs, fn
          {k, v}, acc when is_binary(v) ->
            case Regex.compile(v) do
              {:ok, _} -> {:cont, acc}
              {:error, {err, _}} when is_binary(err) ->
                {:halt, add_error(acc, :claims_like, "#{k} must map to a valid regex: #{err}")}
              _ -> {:halt, add_error(acc, :claims_like, "#{k} must map to a valid regex")}
            end
          {k, _v}, acc -> {:halt, add_error(acc, :claims_like, "#{k} must be a map of strings")}
        end)
      _ -> cs
    end
  end
end
