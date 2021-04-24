defmodule Console.Cron.Jobs do
  alias Console.Repo
  alias Console.Schema.{Build, Invite}

  def prune_builds() do
    Build.expired()
    |> Repo.delete_all()
  end

  def prune_invites() do
    Invite.expired()
    |> Repo.delete_all()
  end
end
