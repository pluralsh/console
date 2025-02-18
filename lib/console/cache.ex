defmodule Console.Cache do
  use Nebulex.Cache,
    otp_app: :console,
    adapter: Nebulex.Adapters.Partitioned,
    primary_storage_adapter: Nebulex.Adapters.Local

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
