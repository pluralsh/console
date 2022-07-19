import {LoginPage} from '@pages/login';

describe('bounce the airbyte app', () => {
  it('log in to the console', () => {
    LoginPage.visit();
    LoginPage.login();
    expect(false)
  })
});
