import Botanist

alias Console.Deployments.Init

seed do
  {:ok, _} = Init.setup_groups(System.get_env("ADMIN_EMAIL"))
end
