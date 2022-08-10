import { BuildsPage } from '@pages/builds'
import { LoginPage } from '@pages/login'
import { RootPage } from '@pages/root'

context('Bounce story', () => {
  describe('bounce the first installed app', () => {
    beforeEach(() => LoginPage.login())

    it('should bounce the application', () => {
      RootPage.visit()
      BuildsPage.bounce()
    })
  })
})
