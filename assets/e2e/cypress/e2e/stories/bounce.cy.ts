import {BuildsPage} from '@pages/builds';
import {LoginPage} from '@pages/login';

context('Tests', () => {

  // beforeEach(() => {
  //   cy.intercept('POST', '/gql', (req) => {
  //     // Queries
  //     aliasQuery(req, 'Builds')
  //     aliasQuery(req, 'Build')
  //     aliasQuery(req, 'Me')
  //     aliasQuery(req, 'LoginInfo')
  //     aliasQuery(req, 'LoginMethod')
  //     aliasQuery(req, 'OIDCConsent')
  //
  //     // Mutations
  //     aliasMutation(req, 'CreateBuild')
  //     aliasMutation(req, 'Callback')
  //     aliasMutation(req, 'Login')
  //     aliasMutation(req, 'AcceptLogin')
  //     aliasMutation(req, 'Consent')
  //   })
  // })
  describe('bounce the first installed app', () => {
    it('log in to the console and bounce application', () => {
      LoginPage.visit();
      LoginPage.login();
      BuildsPage.bounce();
    })
  });
})
