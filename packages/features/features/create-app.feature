Feature: App creation

Scenario: I create a new app with Yarn
  Given I have a working directory
  Then I create an app named MyApp with yarn as dependency manager

Scenario: I create a new app with npm
  Given I have a working directory
  Then I create an app named MyApp with npm as dependency manager
