defmodule Console.Email.Builder.Secret do
  use Console.Email.Base

  def email(share, user) do
    %{notification_bindings: notifs} = share =
      Repo.preload(share, [:notification_bindings])

    base_email()
    |> to(expand_bindings(notifs))
    |> subject("#{user.name} has shared a one-time secret with you")
    |> assign(:share, share)
    |> assign(:user, user)
    |> render(:secret)
  end
end
