defmodule ElasticsearchUtils do
  @moduledoc """
  Helper functions for elasticsearch. This uses Tesla and HTTPoison to directly make the HTTP requests.
  In all cases, base_url is the url for the cluster (ex. if running locally, something like "http://localhost:9200"),
  and index_name is the name of the index to use.
  """

  require Tesla

  @host Application.compile_env(:elasticsearch, :host)
  @index Application.compile_env(:elasticsearch, :index)

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

  def index_doc(doc, base_url \\ @host, index_name \\ @index) do
    HTTPoison.post!(base_url <> "/#{index_name}/_doc", Jason.encode!(doc),
      "Content-Type": "application/json"
    )
  end

  def refresh(base_url \\ @host, index_name \\ @index) do
    HTTPoison.post!(base_url <> "/#{index_name}/_refresh", "")
  end
end
