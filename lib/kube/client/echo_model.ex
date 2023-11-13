defmodule Kube.Client.EchoModel do
  def encode(map), do: map

  def decode(map), do: {:ok, map}
end
