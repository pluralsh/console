defmodule Console.Cron.Jobs do
  alias Console.Repo
  alias Console.Schema.{Build, Invite, Notification, Audit, RefreshToken}
  alias Console.PubSub.BuildFailed
  require Logger

  def prune_builds() do
    Build.expired()
    |> Repo.delete_all()
  end

  def prune_invites() do
    Invite.expired()
    |> Repo.delete_all()
  end

  def prune_notifications() do
    Notification.expired()
    |> Repo.delete_all()
  end

  def prune_audits() do
    Audit.expired()
    |> Repo.delete_all()
  end

  def prune_refresh_tokens() do
    RefreshToken.expired()
    |> Repo.delete_all()
  end

  def fail_builds() do
    Logger.info "Pruning unmarked failed builds"
    expires = Timex.now() |> Timex.shift(minutes: -2)
    Build.with_status(:running)
    |> Build.pinged(expires)
    |> Build.selected()
    |> Repo.update_all(set: [status: :failed])
    |> elem(1)
    |> Enum.map(&Console.Services.Base.handle_notify(BuildFailed, &1))
  end
end
