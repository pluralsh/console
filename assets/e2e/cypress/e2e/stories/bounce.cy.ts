import {BuildsPage} from '@pages/builds';
import {LoginPage} from '@pages/login';

context('Tests', () => {
  describe('bounce the first installed app', () => {
    it('log in to the console and bounce application', () => {
      LoginPage.visit();
      LoginPage.login();
      BuildsPage.bounce();
    })
  });
})
