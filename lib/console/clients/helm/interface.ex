defprotocol Console.Helm.Interface do
  alias Console.Helm

  @doc """
  Fetches the repository's index. `prev` is the index from the last fetch, if any, and is returned
  as is when the repository reports it unchanged.
  """
  @spec index(struct, Helm.Index.t | nil) :: {:ok, Helm.Index.t} | Console.error
  def index(client, prev)

  @spec chart(struct, Helm.Index.t, binary, binary) :: {:ok, struct, binary, binary} | Console.error
  def chart(client, index, chart, vsn)

  @spec download(struct, binary, any) :: {:ok, %Req.Response{}} | Console.error
  def download(client, url, to)
end
