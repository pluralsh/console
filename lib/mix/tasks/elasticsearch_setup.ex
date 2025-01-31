# lib/mix/tasks/elasticsearch_setup.ex
defmodule Mix.Tasks.ElasticsearchSetup do
  use Mix.Task
  require Tesla

  @elastic_cluster_url Application.compile_env(:elasticsearch_test, :cluster_url)
  @elastic_index_name Application.compile_env(:elasticsearch_test, :index_name)

  def run(_) do
    HTTPoison.start()
    with true <- index_exists?(@elastic_cluster_url, @elastic_index_name) do
      IO.puts("Elasticsearch index #{@elastic_index_name} already exists at #{@elastic_cluster_url}. Will delete")
      delete_index(@elastic_cluster_url, @elastic_index_name)
      IO.puts("Deleted index #{@elastic_index_name} at #{@elastic_cluster_url}")
    end

    create_index(@elastic_cluster_url, @elastic_index_name)
    IO.puts("Created fresh index #{@elastic_index_name} at #{@elastic_cluster_url}")
  end

  def index_exists?(base_url, index_name) do
    Tesla.get!(base_url <> "/#{index_name}").status == 200
  end

  def delete_index(base_url, index_name) do
    Tesla.delete!(base_url <> "/#{index_name}")
  end

  def create_index(base_url, index_name) do
    HTTPoison.put!(base_url <> "/#{index_name}", "", [])
  end
end
