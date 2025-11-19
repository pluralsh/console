defmodule Console.Deployments.Pr.Impl.Pass do
  @behaviour Console.Deployments.Pr.Dispatcher

  def create(_pr, _branch, _ctx, _labels \\ []), do: {:ok, ""}

  def webhook(_, _), do: :ok

  def pr(_), do: :ignore

  def review(_, _, _), do: {:ok, ""}

  def files(_, _), do: {:ok, []}

  def pr_info(_), do: {:ok, %{}}

  def approve(_, _, _), do: {:ok, ""}

  def commit_status(_, _, _, _, _), do: :ok

  def merge(_, _), do: :ok

  def slug(_), do: {:ok, ""}
end
