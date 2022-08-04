import {LoginPage} from '@pages/login';
import {BuildsPage} from '@pages/builds';
import { aliasQuery, aliasMutation } from '../../utils/graphql-test-utils'

context('Tests', () => {

  // beforeEach(() => {
  //   cy.intercept('POST', '/gql', (req) => {
  //     // Queries
  //     aliasQuery(req, 'Builds')
  //     aliasQuery(req, 'Build')

  //     // Mutations
  //     aliasMutation(req, 'CreateBuild')
  //     aliasMutation(req, 'Callback')
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
