defmodule Watchman.GraphQl.Cache do
  @behaviour Apq.CacheProvider
  alias Watchman.ReplicatedCache, as: Cache

  def get(hash), do: {:ok, Cache.get({:apq, hash})}

  def put(hash, query) do
    case Cache.put({:apq, hash}, query) do
      :ok -> {:ok, true}
      _ -> {:ok, false}
    end
  end
end