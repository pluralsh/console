defmodule OpensearchUtils do
  @moduledoc """
  Helper functions for elasticsearch. This uses Tesla and HTTPoison to directly make the HTTP requests.
  In all cases, base_url is the url for the cluster (ex. if running locally, something like "http://localhost:9200"),
  and index_name is the name of the index to use.
  """
  alias Console.Schema.{Service, Cluster}
  require Tesla

  @host Application.compile_env(:opensearch, :host)
  @index Application.compile_env(:opensearch, :index)
  @vector_index Application.compile_env(:opensearch, :vector_index)
  @aws_access_key_id Application.compile_env(:opensearch, :aws_access_key_id)
  @aws_secret_access_key Application.compile_env(:opensearch, :aws_secret_access_key)
  @aws_session_token Application.compile_env(:opensearch, :aws_session_token)
  @aws_region Application.compile_env(:opensearch, :aws_region)

  @headers [{"Content-Type", "application/json"}, {"X-Amz-Algorithm", @aws_session_token}]
  @aws_sigv4_headers [
    service: @aws_service_name,
    region: @aws_region,
    access_key_id: @aws_access_key_id,
    secret_access_key: @aws_secret_access_key
  ]

  def index(), do: @index
  def vector_index(), do: @vector_index

  def vector(), do: Enum.map(1..Console.AI.Utils.embedding_dims(), fn _ -> :rand.uniform() end)

  def os_vector_settings() do
    %{
      host: @host,
      index: @vector_index,
      aws_access_key_id: @aws_access_key_id,
      aws_secret_access_key: @aws_secret_access_key,
      aws_session_token: @aws_session_token,
      aws_region: @aws_region
    }
  end

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

  # def refresh(index_name \\ @index) do
  #   Path.join([@host, index_name, "_refresh"])
  #   |> HTTPoison.post!("")
  # end
  def refresh(%{index: index} = es) do
    Req.new([
      url: url(es, "#{index}/_refresh"),
      method: :post,
      headers: headers(es),
      aws_sigv4: aws_sigv4_headers(es)
    ])
    |> Req.post!()
  end

  def drop_index(index_name) do
    Path.join([@host, index_name])
    |> HTTPoison.delete!()
  end

  def count_index(index_name) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get("#{@host}/#{index_name}/_count"),
         {:ok, %{"count" => count}} <- Jason.decode(body) do
      {:ok, count}
    end
  end

  defp url(%{host: host}, path), do: Path.join(host, path)
end
