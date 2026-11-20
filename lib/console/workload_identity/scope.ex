defmodule Console.WorkloadIdentity.Scope do
  @moduledoc """
  A workload identity scope type: which subjects, audiences and custom claims its issuers may mint, and for how long.
  Register implementations in `Console.WorkloadIdentity.scopes/0`.
  """

  @doc "Whether `subject` may be minted by the issuer of `scope_id`"
  @callback subject?(scope_id :: binary, subject :: binary) :: boolean
  @doc "Whether `audience` is an allowed token audience"
  @callback audience?(audience :: binary) :: boolean
  @doc "The custom claims tokens may carry"
  @callback claims() :: [binary]
  @callback default_ttl() :: integer
  @callback max_ttl() :: integer

  @doc """
  Validates a mint request against a scope, returning the ttl to use.
  """
  @spec validate(module, binary, binary, binary, map, integer | nil) :: {:ok, integer} | {:error, binary}
  def validate(mod, scope_id, subject, audience, claims, ttl) do
    allowed = MapSet.new(mod.claims())
    with true <- mod.subject?(scope_id, subject) || {:error, "subject #{subject} is not allowed for this issuer"},
         true <- (is_binary(audience) && mod.audience?(audience)) || {:error, "audience #{audience} is not allowed for this issuer"},
         [] <- Enum.reject(Map.keys(claims), &MapSet.member?(allowed, &1)) do
      ttl(ttl, mod.default_ttl(), mod.max_ttl())
    else
      [_ | _] = extra -> {:error, "claims #{Enum.join(extra, ", ")} are not allowed for this issuer"}
      err -> err
    end
  end

  defp ttl(nil, default, _), do: {:ok, default}
  defp ttl(ttl, _, max) when is_integer(ttl) and ttl > 0 and ttl <= max, do: {:ok, ttl}
  defp ttl(ttl, _, max), do: {:error, "token lifetime #{ttl} must be between 1 and #{max} seconds"}
end
