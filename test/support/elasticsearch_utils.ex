defmodule ElasticsearchHelper do
  @moduledoc """
  Helper functions for elasticsearch. This uses Tesla and HTTPoison to directly make the HTTP requests.
  In all cases, base_url is the url for the cluster (ex. if running locally, something like "http://localhost:9200"),
  and index_name is the name of the index to use.
  """

  require Tesla

  def index_exists?(base_url, index_name) do
    resp = Tesla.get!(base_url <> "/#{index_name}")
    IO.inspect(resp.status)
    resp.status == 200
  end

  def delete_index(base_url, index_name) do
    Tesla.delete!(base_url <> "/#{index_name}")
  end

  def create_index(base_url, index_name) do
    HTTPoison.put(base_url <> "/#{index_name}", "", [])
  end

  def index_documents(base_url, index_name, docs_json) do
    Enum.each(docs_json, fn doc ->
      HTTPoison.post!(base_url <> "/#{index_name}/_doc", Jason.encode!(doc),
        "Content-Type": "application/json"
      )
    end)

    HTTPoison.post!(base_url <> "/#{index_name}/_refresh", "")
  end
end
