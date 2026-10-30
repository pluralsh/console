Postgrex.Types.define(
  Console.PostgrexTypes,
  Pgvector.extensions() ++ Ecto.Adapters.Postgres.extensions(),
  json: Console.JSON.Postgres
)
