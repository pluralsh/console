defprotocol Console.GraphQl.Exception do
  @fallback_to_any true
  @spec error(struct) :: term
  def error(event)
end

defimpl Console.GraphQl.Exception, for: Any do
  def error(_), do: {500, "unknown error"}
end

defimpl Console.GraphQl.Exception, for: Ecto.NoResultsError do
  def error(_), do: {404, "could not find resource"}
end

defimpl Console.GraphQl.Exception, for: Ecto.CastError do
  def error(_), do: {400, "invalid input"}
end
