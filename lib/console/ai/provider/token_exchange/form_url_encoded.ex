defmodule Console.AI.Provider.TokenExchange.FormURLEncoded do
  @moduledoc false

  @spec encode!(%{binary() => term()} | map()) :: binary()
  def encode!(map) when is_map(map), do: URI.encode_query(map)

  @spec decode!(binary()) :: %{binary() => binary()}
  def decode!(binary) when is_binary(binary), do: URI.decode_query(binary)
end
