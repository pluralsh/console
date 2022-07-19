import {LoginPage} from '@pages/login';

describe('bounce the airbyte app', () => {
  it('log in to the console', () => {
    expect(false).to.be.true;
    LoginPage.visit();
    LoginPage.login();
  })
});
