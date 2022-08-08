import {BuildsPage} from '@pages/builds';
import {LoginPage} from '@pages/login';

context('Tests', () => {
  describe('deploy the first installed app', () => {
    it('log in to the console and deploy application', () => {
      LoginPage.visit();
      LoginPage.login();
      BuildsPage.deploy();
    })
  });
})
