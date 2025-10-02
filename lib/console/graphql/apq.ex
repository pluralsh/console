defmodule Console.GraphQl.Apq do
  use Apq.DocumentProvider,
    json_codec: Jason,
    cache_provider: Console.GraphQl.Cache,
    strategy: Apq.Strategy.BluePrintQuery
end
