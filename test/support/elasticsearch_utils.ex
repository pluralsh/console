defmodule ElasticsearchUtils do
  @moduledoc """
  Helper functions for elasticsearch. This uses Tesla and HTTPoison to directly make the HTTP requests.
  In all cases, base_url is the url for the cluster (ex. if running locally, something like "http://localhost:9200"),
  and index_name is the name of the index to use.
  """
  alias Console.Schema.{Service, Cluster}
  require Tesla

  @host Application.compile_env(:elasticsearch, :host)
  @index Application.compile_env(:elasticsearch, :index)
  @vector_index Application.compile_env(:elasticsearch, :vector_index)

  def index(), do: @index
  def vector_index(), do: @vector_index

  def vector(), do: Enum.map(1..Console.AI.Utils.embedding_dims(), fn _ -> :rand.uniform() end)

  def es_vector_settings(), do: %{host: @host, index: @vector_index}

  def log_document(%Service{} = service, message) do
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

  def log_document(%Cluster{} = cluster, namespace, message) do
    %{
      "@timestamp" => Timex.now(),
      "message" => message,
      "kubernetes" => %{
        "namespace" => namespace
      },
      "cluster" => %{
        "handle" => cluster.handle
      }
    }
  end

  def index_doc(doc, index_name \\ @index) do
    Path.join([@host, index_name, "_doc"])
    |> HTTPoison.post!(Jason.encode!(doc), ["Content-Type": "application/json"])
  end

  def refresh(index_name \\ @index) do
    Path.join([@host, index_name, "_refresh"])
    |> HTTPoison.post!("")
  end

  def count_index(index_name) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get("#{@host}/#{index_name}/_count"),
         {:ok, %{"count" => count}} <- Jason.decode(body) do
      {:ok, count}
    end
  end
end
