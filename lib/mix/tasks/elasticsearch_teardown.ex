defmodule Mix.Tasks.ElasticsearchTeardown do
  use Mix.Task
  require Tesla

  @elastic_cluster_url Application.compile_env(:elasticsearch_test, :cluster_url)
  @elastic_index_name Application.compile_env(:elasticsearch_test, :index_name)

  def run(_) do
    delete_index(@elastic_cluster_url, @elastic_index_name)
    IO.puts("Deleted index #{@elastic_index_name} at #{@elastic_cluster_url}")
  end

  def delete_index(base_url, index_name) do
    Tesla.delete!(base_url <> "/#{index_name}")
  end
end
