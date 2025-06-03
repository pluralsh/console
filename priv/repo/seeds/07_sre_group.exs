import Botanist

alias Console.Deployments.Init

seed do
  Init.setup_groups(System.get_env("ADMIN_EMAIL"))
end
