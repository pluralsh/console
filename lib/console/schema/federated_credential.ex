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
           {:ok, re} <- compile_claim(v) do
        claim_matches?(re, val)
      else
        _ -> false
      end
    end)
  end
  def allow?(_, _), do: false

  # claim regexes must match the entire value. The raw pattern is compiled first so unbalanced
  # input like `a)|(?:b` can't close the wrapping group and escape the anchors.
  defp compile_claim(pattern) when is_binary(pattern) do
    with {:ok, _} <- Regex.compile(pattern),
      do: Regex.compile("\\A(?:#{pattern})\\z")
  end
  defp compile_claim(_), do: {:error, :invalid}

  # list claims (eg kubernetes' `"aud": ["plural"]`) match if any of their values do
  defp claim_matches?(re, vals) when is_list(vals), do: Enum.any?(vals, &claim_matches?(re, &1))
  defp claim_matches?(re, val) when is_binary(val), do: Regex.match?(re, val)
  defp claim_matches?(re, val) when is_number(val) or is_boolean(val),
    do: Regex.match?(re, to_string(val))
  defp claim_matches?(_, _), do: false

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
            case compile_claim(v) do
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
