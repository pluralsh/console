import { LoginPage } from '@pages/login'

context('Login story', () => {
  describe('login into the app', () => {
    beforeEach(() => LoginPage.login())
  })
})
