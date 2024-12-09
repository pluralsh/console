defmodule Console.LocalRepo do
  use Ecto.Repo,
    otp_app: :console,
    adapter: Ecto.Adapters.SQLite3
  use Bourne

  def explain(query) do
    {sql, params} = Ecto.Adapters.SQL.to_sql(:all, __MODULE__, query)
    IO.puts "planning #{sql}...\n"

    sql = "EXPLAIN QUERY PLAN #{sql}"

    {:error, %{rows: rows}} =
      __MODULE__.transaction(fn ->
        __MODULE__
        |> Ecto.Adapters.SQL.query!(sql, params)
        |> __MODULE__.rollback()
      end)

    Enum.each(rows, &IO.puts/1)
    query
  end
end
