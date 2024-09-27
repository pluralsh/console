defmodule Console.Email.Builder.Notification do
  use Console.Email.Base
  alias Console.Schema.AppNotification

  def email(notif) do
    %{user: user} = notif =
      Repo.preload(notif, [:user])

    base_email()
    |> to(user)
    |> subject(grab_title(notif))
    |> assign(:notification, notif)
    |> assign(:user, user)
    |> render(:notification)
  end

  defp grab_title(%AppNotification{text: text}) do
    case String.split(text, "\n") do
      [first, _ | _] -> first
      _ -> "You have a new activity in Plural!"
    end
  end
end
