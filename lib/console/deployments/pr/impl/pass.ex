defmodule Console.Deployments.Pr.Impl.Pass do
  @behaviour Console.Deployments.Pr.Dispatcher

  def create(_, _, _, _), do: {:ok, ""}
end
