defmodule Console.AI.Graph.Indexer.SourceTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.AI.Graph.Indexer.Source

  describe "ingest_conn/1" do
    test "it can ingest a connection" do
      conn = insert(:cloud_connection)
      result = [
        {:ok, %Cloudquery.ExtractOutput{type: "table", result: "{\"key\":\"value\"}", id: "id", links: ["link"]}},
        {:ok, %Cloudquery.ExtractOutput{type: "table", result: "{\"key\":\"value\"}", id: "id", links: ["link"]}},
      ]
      expect(GRPC.Stub, :connect, fn _ -> {:ok, :channel} end)
      expect(Cloudquery.CloudQuery.Stub, :extract, fn :channel, _ -> {:ok, result} end)
      expect(Console.AI.Graph.Indexer.Sink, :ingest, 1, fn _ -> :ok end)

      Source.ingest_conn(conn)
    end
  end
end
