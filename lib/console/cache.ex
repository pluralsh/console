defmodule Console.Cache do
  use Nebulex.Cache,
    otp_app: :console,
    adapter: Nebulex.Adapters.Partitioned,
    primary_storage_adapter: Nebulex.Adapters.Local

  @not_found {__MODULE__, :not_found}

  @doc """
  Fetches a value from an existing cache, storing both successful lookups and misses.

  Misses use a non-nil sentinel because Nebulex treats `nil` as a cache miss. Their
  shorter TTL limits how long a newly-created value could be hidden by a prior miss.
  """
  def fetch_or_store(cache, key, fun, opts \\ []) do
    negative_ttl = Keyword.get(opts, :negative_ttl, :timer.minutes(5))
    cache_opts = Keyword.delete(opts, :negative_ttl)

    case cache.get(key) do
      @not_found ->
        nil

      nil ->
        case fun.() do
          nil ->
            cache.put(key, @not_found, Keyword.put(cache_opts, :ttl, negative_ttl))
            nil

          value ->
            cache.put(key, value, cache_opts)
            value
        end

      value ->
        value
    end
  end

  def cached(adapter, key, fun, opts \\ []) do
    case adapter.get(key) do
      nil ->
        val = fun.()
        adapter.put(key, val, opts)
        val
      res -> res
    end
  end

  def process_cache(key, fun) do
    case Process.get(key, :miss) do
      :miss ->
        val = fun.()
        Process.put(key, val)
        val
      val -> val
    end
  end
end

defmodule Console.ReplicatedCache do
  use Nebulex.Cache,
    otp_app: :console,
    adapter: Nebulex.Adapters.Replicated
end

defmodule Console.LocalCache do
  use Nebulex.Cache,
    otp_app: :console,
    adapter: Nebulex.Adapters.Local
end

defmodule Console.MultilevelCache do
  use Nebulex.Cache,
    otp_app: :console,
    adapter: Nebulex.Adapters.Multilevel

  defmodule L1 do
    use Nebulex.Cache,
      otp_app: :console,
      adapter: Nebulex.Adapters.Local
  end

  defmodule L2 do
    use Nebulex.Cache,
      otp_app: :console,
      adapter: Nebulex.Adapters.Partitioned
  end
end

defmodule Console.TestCache do
  use Nebulex.Cache,
    otp_app: :console,
    adapter: Nebulex.Adapters.Nil
end
