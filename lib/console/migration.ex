defmodule Console.Migration do
  defmacro __using__(_) do
    quote do
      use Ecto.Migration

      def after_begin() do
        if Console.conf(:cockroached) do
          repo().query! "SET enable_implicit_transaction_for_batch_statements=off"
        end
      end
    end
  end
end
