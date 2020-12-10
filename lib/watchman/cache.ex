defmodule Watchman.Cache do
  use Nebulex.Cache,
    otp_app: :watchman,
    adapter: Nebulex.Adapters.Partitioned,
    primary_storage_adapter: Nebulex.Adapters.Local
end

defmodule Watchman.ReplicatedCache do
  use Nebulex.Cache,
    otp_app: :watchman,
    adapter: Nebulex.Adapters.Replicated
end