import Botanist

alias Console.Deployments.Init

seed do
  {:ok, _} = Init.setup()
end
