# lib/mix/tasks/elasticsearch_setup.ex
defmodule Mix.Tasks.ElasticsearchSetup do
  use Mix.Task
  require Tesla

  @base_url "http://localhost:9200"
  @index_name "testindex"

  def run(_args) do
    client = Tesla.client([
      {Tesla.Middleware.BaseUrl, @base_url},
      Tesla.Middleware.JSON
    ])

    if index_exists?(client, @index_name) do
      IO.puts("Index #{@index_name} already exists at #{@base_url}")
      delete_index(client, @index_name)
      IO.puts("Index #{@index_name} at #{@base_url} deleted")
    end

    create_index(client, @index_name)
    IO.puts("Index #{@index_name} created at #{@base_url}")
  end

  defp index_exists?(client, index_name) do
    case Tesla.get(client, "/#{index_name}") do
      {:ok, %Tesla.Env{status: 200}} -> true
      {:error, reason} ->
        IO.puts("Error: #{reason}")
        false
      _ -> false
    end
  end

  defp delete_index(client, index_name) do
    case Tesla.delete(client, "/#{index_name}") do
      {:ok, %Tesla.Env{status: 200}} -> true
      {:ok, %Tesla.Env{status: 404}} -> true
      {:error, reason} ->
        IO.puts("Error: #{reason}")
        false
      _ -> false
    end
  end

  defp create_index(client, index_name) do
    case Tesla.put(client, "/#{index_name}", %{}, []) do
      {:ok, %Tesla.Env{status: 200}} -> true
      {:error, reason} ->
        IO.puts("Error: #{reason}")
        false
      _ -> false
    end
  end
end
