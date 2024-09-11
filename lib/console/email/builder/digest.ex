defmodule Console.Email.Builder.Digest do
  use Console.Email.Base

  def email(user, count) do
    base_email()
    |> to(user)
    |> subject("You have #{count} new activities in Plural!")
    |> assign(:count, count)
    |> render(:digest)
  end
end
