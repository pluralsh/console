defmodule Console.Logs.Stream.JsonLine do
  @eol ~r/(\r?\n|\r)/

  @spec parse(binary) :: {[{:ok, map} | {:error, term}], binary}
  def parse(chunk) do
    chunks = String.split(chunk, @eol)
    {straggle, full} = List.pop_at(chunks, -1)
    {Enum.map(full, &Jason.decode/1), straggle}
  end
end
