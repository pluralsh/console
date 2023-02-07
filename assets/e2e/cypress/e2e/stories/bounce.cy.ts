import { BuildsPage } from '@pages/builds'
import { LoginPage } from '@pages/login'

context('Bounce story', () => {
  describe('bounce the first installed app', () => {
    beforeEach(() => LoginPage.login())

    it('should bounce the application', () => {
      BuildsPage.visit()
      BuildsPage.bounce()
    })
  })
})
