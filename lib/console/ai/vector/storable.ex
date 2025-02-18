defprotocol Console.AI.Vector.Storable do
  @spec content(any) :: binary | :ignore
  def content(any)

  @spec datatype(any) :: binary
  def datatype(any)
end

defimpl Console.AI.Vector.Storable, for: Any do
  def content(_), do: :ignore

  def datatype(_), do: "any"
end
