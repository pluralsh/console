defimpl Bamboo.Formatter, for: Console.Schema.User do
  def format_email_address(%@for{name: n, email: e}, _opts),
    do: {n, e}
end
