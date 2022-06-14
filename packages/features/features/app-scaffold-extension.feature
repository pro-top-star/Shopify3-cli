Feature: Extension creation

@skip_node_14
Scenario: I scaffold a checkout_post_purchase extension
  Given I have a working directory
  And I create an app named MyExtendedApp with yarn as dependency manager
  When I create an extension named MyExtension of type checkout_post_purchase and flavor react
  Then I have a ui extension named MyExtension of type checkout_post_purchase

@skip_node_14
Scenario: I scaffold a theme extension
  Given I have a working directory
  And I create an app named MyExtendedApp with yarn as dependency manager
  When I create an extension named MyExtension of type theme
  Then I have a theme extension named MyExtension of type theme
  Then The extension named MyExtension contains the theme extension directories

@skip_node_14
Scenario: I scaffold two theme extensions
  Given I have a working directory
  And I create an app named MyExtendedApp with yarn as dependency manager
  When I create an extension named MyExtension of type theme
  When I create an extension named MyExtension2 of type theme
  Then I have a theme extension named MyExtension of type theme
  Then I do not have a theme extension named MyExtension2 of type theme

@skip_node_14
Scenario: I scaffold a function extension
  Given I have a working directory
  And I create an app named MyExtendedApp with yarn as dependency manager
  When I create an extension named MyExtension of type payment_methods and flavor wasm
  Then I have a function extension named MyExtension of type payment_methods
