import { BuildsPage } from '@pages/builds'
import { LoginPage } from '@pages/login'

context('Deploy story', () => {
  describe('deploy the first installed app', () => {
    beforeEach(() => LoginPage.login())

    it('should deploy the application', () => {
      BuildsPage.visit()
      BuildsPage.deploy()
    })
  })
})
