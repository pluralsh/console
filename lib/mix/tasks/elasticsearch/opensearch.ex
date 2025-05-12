defmodule Mix.Tasks.Elasticsearch.Opensearch do
  use Mix.Task

  @es_config %{
    host: "https://search-test-os-domain-ywqsnt77dn2gzynamrk67fdqlq.us-east-1.es.amazonaws.com",
    index: "os-test-index",
    aws_region: "us-east-1",
  }

  @test_vector Enum.map(1..512, fn _ -> :rand.uniform() end)

  @data %{
    "datatype" => "pr",
    "pr" => %{
      "filename" => "terraform/main.tf"
    },
    "passages" => [
      %{
        "text" => "Sample text passage",
        "vector" => @test_vector
      }
    ]
  }

  @query %{
    size: 5,
    query: %{
      nested: %{
        path: "passages",
        query: %{
          knn: %{
            "passages.vector": %{
              vector: @test_vector,
              k: 5,
              num_candidates: 100
            }
          }
        }
      }
    }
  }

  @index_mappings_os %{
    settings: %{
      index: %{
        knn: true
      }
    },
    mappings: %{
      properties: %{
        passages: %{
          type: "nested",
          properties: %{
            vector: %{
              type: "knn_vector",
              dimension: 512,
              method: %{
                name: "hnsw",
                space_type: "cosinesimil",
              }
            },
            text: %{
              type: "text",
              index: false
            }
          }
        },
        "@timestamp": %{type: "date"},
        datatype: %{type: "keyword"}
      }
    }
  }

  @headers [{"Content-Type", "application/json"}]
  @aws_service_name "es"

  def run(_) do
    # Start the necessary applications
    Application.ensure_all_started(:req)
    Application.ensure_all_started(:finch)

    # Now proceed with your task
    exists = index_exists?(@es_config)
    IO.inspect(exists, label: "index exists")
    if exists do
      IO.puts("Index exists, deleting it first...")
      IO.inspect(delete(@es_config), label: "delete response")
    else
      IO.puts("Index does not exist, creating it...")
    end
    IO.inspect(init(@es_config), label: "init response")
    IO.inspect(insert(@es_config, @data), label: "insert response")
    IO.inspect(refresh(@es_config), label: "refresh response")
    IO.inspect(search(@es_config, @query), label: "search response")
  end

  def index_exists?(%{index: index} = es) do
    Req.new([
      url: url(es, index),
      method: :get,
      headers: headers(es),
      aws_sigv4: aws_sigv4_headers(es)
    ])
    |> Req.get()
    |> case do
      {:ok, %Req.Response{status: code}} when code >= 200 and code < 300 -> true
      _ -> false
    end
  end

  def delete(%{index: index} = es) do
    Req.new([
      url: url(es, index),
      method: :delete,
      headers: headers(es),
      aws_sigv4: aws_sigv4_headers(es)
    ])
    |> Req.delete()
    |> handle_response("could not delete elasticsearch:")
  end

  def init(%{index: index} = es) do
    Req.new([
      url: url(es, index),
      method: :put,
      headers: headers(es),
      body: Jason.encode!(@index_mappings_os),
      aws_sigv4: aws_sigv4_headers(es)
    ])
    |> Req.put()
    |> handle_response("could not initialize elasticsearch:")
  end

  def insert(%{index: index} = es, data) do
    Req.new([
      url: url(es, "#{index}/_doc"),
      method: :post,
      headers: headers(es),
      body: Jason.encode!(data),
      aws_sigv4: aws_sigv4_headers(es)
    ])
    |> Req.post()
    |> handle_response("could not insert elasticsearch:")
  end

  def search(%{index: index} = es, query) do
    Req.new([
      url: url(es, "#{index}/_search"),
      method: :post,
      headers: headers(es),
      body: Jason.encode!(query),
      aws_sigv4: aws_sigv4_headers(es)
    ])
    |> Req.post()
    |> IO.inspect(label: "search response")
    |> handle_response("could not search elasticsearch:")
  end

  def refresh(%{index: index} = es) do
    Req.new([
      url: url(es, "#{index}/_refresh"),
      method: :post,
      headers: headers(es),
      aws_sigv4: aws_sigv4_headers(es)
    ])
    |> Req.post()
    |> handle_response("could not refresh elasticsearch:")
  end

  defp handle_response({:ok, %Req.Response{status: code}}, _) when code >= 200 and code < 300, do: :ok
  defp handle_response({:ok, %Req.Response{body: body}}, modifier), do: {:error, "#{modifier}: #{Jason.encode!(body)}"}
  defp handle_response(_, modifier), do: {:error, "#{modifier}: elasticsearch error"}

  defp url(%{host: host}, path), do: Path.join(host, path)

  defp headers(%{} = es) do
    [{"X-Amz-Security-Token", Map.get(es, :aws_session_token) || System.get_env("AWS_SESSION_TOKEN")} | @headers]
  end
  defp headers(%{user: u, password: p}) when is_binary(u) and is_binary(p),
    do: [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | @headers]
  defp headers(_), do: @headers

  defp aws_sigv4_headers(es) do
    [
      service: @aws_service_name,
      region: es.aws_region || System.get_env("AWS_REGION"),
      access_key_id: Map.get(es, :aws_access_key_id) || System.get_env("AWS_ACCESS_KEY_ID"),
      secret_access_key: Map.get(es, :aws_secret_access_key) || System.get_env("AWS_SECRET_ACCESS_KEY")
    ]
  end
end
