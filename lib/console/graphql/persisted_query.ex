defmodule Console.GraphQl.PersistedQuery do
  @moduledoc """
  Persisted queries for the GraphQL API.
  """
  use Absinthe.Plug.DocumentProvider.Compiled
  import Console.Prom.Plugin, only: [metric_scope: 1]
  require Logger

  @not_found_error %Absinthe.Blueprint{
    errors: [
      %Absinthe.Phase.Error{
        phase: __MODULE__,
        message: "PersistedQueryNotFound"
      }
    ]
  }

  provide File.read!("assets/src/generated/persisted-queries/goclient.json")
          |> Jason.decode!()
          |> Map.get("operations")
          |> Map.new(fn {key, %{"body" => body}} -> {key, body} end)
          |> Map.merge(
            File.read!("assets/src/generated/persisted-queries/client.json")
            |> Jason.decode!()
            |> Map.get("operations")
            |> Map.new(fn {key, %{"body" => body}} -> {key, body} end)
          )

  def process(%{params: %{"extensions" => %{"persistedQuery" => %{"sha256Hash" => documentId}}}} = req, _),
    do: handle_doc_id(documentId, req)
  def process(%{params: %{"documentId" => documentId}} = req, _), do: handle_doc_id(documentId, req)
  def process(req, _), do: {:cont, req}

  defp handle_doc_id(sha256Hash, req) do
    Logger.info("Handling persisted query with sha256Hash: #{sha256Hash}")
    case {find_document(sha256Hash), get_query(req)} do
      {nil, nil} -> {:halt, %{req | document: @not_found_error}}
      {nil, _} -> {:cont, req}
      {document, _} -> {:halt, %{req | document: document, document_provider_key: sha256Hash}}
    end
  end

  defp find_document(hash) do
    case __absinthe_plug_doc__(:compiled, hash) do
      nil ->
        :telemetry.execute(metric_scope(:persisted_query_miss), %{count: 1}, %{})
        nil
      document ->
        :telemetry.execute(metric_scope(:persisted_query_hit), %{count: 1}, %{})
        document
    end
  end

  defp get_query(%{params: %{"query" => query}}), do: query
  defp get_query(_), do: nil
end
