defmodule OpensearchUtils do
  @moduledoc """
  Helper functions for opensearch. This uses Tesla and HTTPoison to directly make the HTTP requests.
  In all cases, base_url is the url for the cluster (ex. if running locally, something like
  "http://opensearch-local.us-east-1.localhost.localstack.cloud:4567" - see config/test.exs),
  and index_name is the name of the index to use.
  """
  alias Console.Schema.{Service, Cluster}

  @host Application.compile_env(:opensearch, :host)
  @index Application.compile_env(:opensearch, :index)
  @vector_index Application.compile_env(:opensearch, :vector_index)
  @aws_access_key_id Application.compile_env(:opensearch, :aws_access_key_id)
  @aws_secret_access_key Application.compile_env(:opensearch, :aws_secret_access_key)
  @aws_session_token Application.compile_env(:opensearch, :aws_session_token)
  @aws_region Application.compile_env(:opensearch, :aws_region)

  @headers [{"Content-Type", "application/json"}, {"X-Amz-Security-Token", @aws_session_token}]
  @aws_sigv4_headers [
    service: "es",
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
    Req.new([
      url: Path.join([@host, index_name, "_doc"]),
      method: :post,
      headers: @headers,
      body: Jason.encode!(doc),
      aws_sigv4: @aws_sigv4_headers
    ])
    |> Req.post!()
  end

  def refresh(index_name \\ @index) do
    Req.new([
      url: Path.join([@host, index_name, "_refresh"]),
      method: :post,
      headers: @headers,
      aws_sigv4: @aws_sigv4_headers
    ])
    |> Req.post!()
  end

  def drop_index(index_name \\ @index) do
    Req.new([
      url: Path.join([@host, index_name]),
      method: :delete,
      headers: @headers,
      aws_sigv4: @aws_sigv4_headers
    ])
    |> Req.delete!()
  end

  def count_index(index_name \\ @index) do
    with {:ok, %Req.Response{status: 200, body: body}} <-
           Req.get(Path.join([@host, index_name, "_count"]), headers: @headers, aws_sigv4: @aws_sigv4_headers),
           %{"count" => count} <- body do
      {:ok, count}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end
end
