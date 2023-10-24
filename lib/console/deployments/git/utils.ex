defmodule Console.Deployments.Git.Utils do
  def normalize_pk(pk) do
    case String.match?(pk, ~r/^.*\R$/) do
      true -> pk
      false -> "#{pk}\n"
    end
  end
end
