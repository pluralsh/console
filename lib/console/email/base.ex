defmodule Console.Email.Base do
  use Bamboo.Phoenix, view: ConsoleWeb.EmailView

  defmacro __using__(_) do
    quote do
      use Bamboo.Phoenix, view: ConsoleWeb.EmailView
      import Console.Email.Base, only: [base_email: 0]
    end
  end

  def base_email() do
    new_email()
    |> from(Console.Mailer.sender())
    |> put_layout({ConsoleWeb.LayoutView, :email})
  end
end
