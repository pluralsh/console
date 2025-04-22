defmodule Console.Logs.Time do
  @type t :: %__MODULE__{}
  defstruct [:after, :before, :duration, :reverse]

  def new(%{} = args), do: struct(__MODULE__,  args)
  def new(args) when is_list(args), do: struct(__MODULE__,  args)
  def new(_), do: nil
end
