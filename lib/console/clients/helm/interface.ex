defprotocol Console.Helm.Interface do
  alias Console.Helm

  @spec index(struct) :: Helm.Index.t
  def index(client)

  @spec chart(struct, Helm.Index.t, binary, binary) :: {:ok, struct, binary, binary} | Console.error
  def chart(client, index, chart, vsn)

  @spec download(struct, binary, any) :: {:ok, %Req.Response{}} | Console.error
  def download(client, url, to)
end
