defmodule Console.Deployments.Pr.Impl.Gitlab do
  @behaviour Console.Deployments.Pr.Dispatcher

  def create(_, _, _, _), do: {:ok, ""}
end
