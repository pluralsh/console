defmodule Console.Deployments.Pr.Impl.Pass do
  @behaviour Console.Deployments.Pr.Dispatcher

  def create(_pr, _branch, _ctx), do: {:ok, ""}

  def webhook(_, _), do: :ok

  def pr(_), do: :ignore

  def review(_, _, _), do: {:ok, ""}

  def files(_, _), do: {:ok, []}
end
