defmodule Console.Schema.VectorEmbedding.Migrator do
  @moduledoc false

  alias Console.Repo

  @debounce_key {:vector_embeddings, :setup}
  @table "embeddings"
  @sql_path "vector_embeddings/embeddings.sql"

  def ensure() do
    Console.debounce(@debounce_key, fn ->
      setup()
    end)
  end

  def recreate() do
    with :ok <- drop(),
         :ok <- setup(),
      do: :ok
  end

  def setup() do
    with {:ok, sql} <- read_sql(),
         :ok <- run_sql(sql),
      do: :ok
  end

  def drop() do
    case Ecto.Adapters.SQL.query(Repo, "DROP TABLE IF EXISTS #{@table} CASCADE", []) do
      {:ok, _} -> :ok
      {:error, reason} -> sql_error(reason)
    end
  end

  def available() do
    case Ecto.Adapters.SQL.query(Repo, "CREATE EXTENSION IF NOT EXISTS vector", []) do
      {:ok, _} -> {:ok, true}
      {:error, reason} -> sql_error(reason)
    end
  end

  defp run_sql(sql) do
    split_statements(sql)
    |> Enum.reduce_while(:ok, fn statement, :ok ->
      case Ecto.Adapters.SQL.query(Repo, statement, []) do
        {:ok, _} -> {:cont, :ok}
        {:error, reason} -> {:halt, sql_error(reason)}
      end
    end)
  end

  defp read_sql() do
    case File.read(sql_path()) do
      {:ok, contents} -> {:ok, contents}
      {:error, reason} -> {:error, "failed to read embeddings sql: #{inspect(reason)}"}
    end
  end

  defp sql_error(exception) when is_exception(exception), do: {:error, Exception.message(exception)}
  defp sql_error(reason), do: {:error, inspect(reason)}

  defp split_statements(sql) do
    sql
    |> String.split(";")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
  end

  defp sql_path do
    Path.join(:code.priv_dir(:console), @sql_path)
  end
end
