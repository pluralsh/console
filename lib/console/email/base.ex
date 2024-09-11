defmodule Console.Email.Base do
  use Bamboo.Phoenix, view: ConsoleWeb.EmailView
  alias Console.Schema.User

  defmacro __using__(_) do
    quote do
      use Bamboo.Phoenix, view: ConsoleWeb.EmailView
      import Console.Email.Base, only: [base_email: 0, expand_bindings: 1]
      alias Console.Repo
    end
  end

  def base_email() do
    new_email()
    |> from(Console.Mailer.sender())
    |> put_layout({ConsoleWeb.LayoutView, :email})
  end

  def expand_bindings(bindings) do
    User.for_bindings(bindings)
    |> Console.Repo.all()
  end
end
