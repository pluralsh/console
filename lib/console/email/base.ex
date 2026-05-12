defmodule Console.Email.Base do
  alias Console.Schema.User

  defmacro __using__(_) do
    quote do
      use Phoenix.Swoosh,
        view: ConsoleWeb.EmailView,
        layout: {ConsoleWeb.LayoutView, :email}
      import Console.Email.Base, only: [base_email: 0, expand_bindings: 1]
      alias Console.Repo
    end
  end

  def base_email() do
    Swoosh.Email.new()
    |> Swoosh.Email.from(Console.Mailer.sender())
  end

  def expand_bindings(bindings) do
    User.for_bindings(bindings)
    |> Console.Repo.all()
  end
end
