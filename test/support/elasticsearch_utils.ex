defmodule ElasticsearchUtils do
  @moduledoc """
  Helper functions for elasticsearch. This uses Tesla and HTTPoison to directly make the HTTP requests.
  In all cases, base_url is the url for the cluster (ex. if running locally, something like "http://localhost:9200"),
  and index_name is the name of the index to use.
  """

  require Tesla

  @default_cluster_url Application.compile_env(:elasticsearch_test, :cluster_url)
  @default_index_name Application.compile_env(:elasticsearch_test, :index_name)

  def log_document(service, message) do
    %{
      "@timestamp" => Timex.now(),
      "message" => message,
      "kubernetes" => %{
        "namespace" => service.namespace
      },
      "cluster" => %{
        "handle" => service.cluster.handle
      }
    }
  end

  def index_doc(doc, base_url \\ @default_cluster_url, index_name \\ @default_index_name) do
    HTTPoison.post!(base_url <> "/#{index_name}/_doc", Jason.encode!(doc),
      "Content-Type": "application/json"
    )
  end

  def refresh(base_url \\ @default_cluster_url, index_name \\ @default_index_name) do
    HTTPoison.post!(base_url <> "/#{index_name}/_refresh", "")
  end
end
