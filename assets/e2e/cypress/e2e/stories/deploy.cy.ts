import {BuildsPage} from '@pages/builds';
import {LoginPage} from '@pages/login';
import {RootPage} from '@pages/root';

context('Deploy story', () => {
  describe('deploy the first installed app', () => {
    beforeEach(() => LoginPage.login())

    it('should deploy the application', () => {
      RootPage.visit();
      BuildsPage.deploy();
    })
  });
})
