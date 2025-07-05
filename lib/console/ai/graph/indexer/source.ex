defmodule Console.AI.Graph.Indexer.Source do
  use GenServer
  import Console.AI.Tools.Agent.Base, only: [to_pb: 1]
  alias Console.Repo
  alias Cloudquery.{ExtractInput, CloudQuery.Stub, ExtractOutput}
  alias CloudQuery.Client
  alias Console.AI.Graph.IndexableItem
  alias Console.AI.Graph.{Provider, Indexer.Sink}
  alias Console.Schema.CloudConnection

  @poll :timer.minutes(60)
  @chunk_size 50

  def start_link(opts \\ []), do: GenServer.start_link(__MODULE__, opts)

  def init(opts) do
    :timer.send_interval(@poll, :poll)
    {:ok, opts}
  end

  def handle_info(:poll, state) do
    if Provider.enabled?() do
      Repo.all(CloudConnection)
      |> Stream.filter(& local?(&1.id))
      |> Enum.each(fn %CloudConnection{} = conn ->
        Repo.preload(conn, [:read_bindings])
        |> ingest_conn()
      end)
    end
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp ingest_conn(%CloudConnection{} = conn) do
    with {:ok, channel} <- Client.connect(),
         {:ok, stream} <- Stub.extract(channel, %ExtractInput{connection: to_pb(conn)}) do
      stream
      |> Stream.map(fn {:ok, out} -> to_indexable(out, conn) end)
      |> Console.throttle(count: 500, pause: :timer.seconds(1))
      |> Stream.chunk_every(@chunk_size)
      |> Enum.each(&Sink.ingest(%Sink.Chunk{connection: conn, chunk: &1}))
    end
  end

  defp to_indexable(%ExtractOutput{type: t, result: result, id: id, links: links}, %CloudConnection{provider: prov}) do
    %IndexableItem{
      provider: prov,
      type: t,
      id: id,
      links: links,
      attributes: Jason.decode!(result),
    }
    |> IndexableItem.with_doc()
  end

  def local?(id), do: agent_node(id) == node()

  defp agent_node(id) do
    ring()
    |> HashRing.key_to_node(id)
  end

  defp ring() do
    HashRing.new()
    |> HashRing.add_nodes([node() | Node.list()])
  end
end
