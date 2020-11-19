defmodule Watchman.GraphQl.Apq do
  use Apq.DocumentProvider,
    json_codec: Jason,
   cache_provider: Watchman.GraphQl.Cache
end