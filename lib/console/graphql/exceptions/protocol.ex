defprotocol Console.GraphQl.Exception do
  @fallback_to_any true
  @spec error(struct) :: term
  def error(event)
end

defimpl Console.GraphQl.Exception, for: Console.InternalException do
  def error(%Console.InternalException{message: message}), do: {400, message}
end

defimpl Console.GraphQl.Exception, for: Any do
  def error(_), do: {500, "unknown error (check the logs for more details)"}
end

defimpl Console.GraphQl.Exception, for: Ecto.NoResultsError do
  def error(_), do: {404, "could not find resource"}
end

defimpl Console.GraphQl.Exception, for: Ecto.CastError do
  def error(_), do: {400, "could not find resource"}
end

defimpl Console.GraphQl.Exception, for: Ecto.Query.CastError do
  def error(_), do: {404, "could not find resource"}
end
