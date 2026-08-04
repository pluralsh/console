defmodule Console.ReverseProxy.Client do
  @finch Console.ReverseProxy.Finch
  @client Tesla.client([], {Tesla.Adapter.Finch, name: @finch})

  def client, do: @client
end
