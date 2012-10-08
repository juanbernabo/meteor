(function () {
  // for convenience
  var loginButtonsSession = Meteor._loginButtonsSession;


  //
  // populate the session so that the appropriate dialogs are
  // displayed by reading variables set by accounts-urls, which parses
  // special URLs
  //

  if (Accounts._resetPasswordToken) {
    loginButtonsSession.set('resetPasswordToken', Accounts._resetPasswordToken);
  }

  if (Accounts._enrollAccountToken) {
    loginButtonsSession.set('enrollAccountToken', Accounts._enrollAccountToken);
  }

  // Needs to be in Meteor.startup because of a package loading order
  // issue. We can't be sure that accounts-password is loaded earlier
  // than accounts-ui so Accounts.validateEmail might not be defined.
  Meteor.startup(function () {
    if (Accounts._validateEmailToken) {
      Accounts.validateEmail(Accounts._validateEmailToken, function(error) {
        Accounts._enableAutoLogin();
        if (!error)
          loginButtonsSession.set('justValidatedUser', true);
        // XXX show something if there was an error.
      });
    }
  });


  //
  // resetPasswordDialog template
  //

  Template.resetPasswordDialog.events({
    'click #login-buttons-reset-password-button': function () {
      resetPassword();
    },
    'keypress #reset-password-new-password': function (event) {
      if (event.keyCode === 13)
        resetPassword();
    },
    'click #login-buttons-cancel-reset-password': function () {
      loginButtonsSession.set('resetPasswordToken', null);
      Accounts._enableAutoLogin();
    }
  });

  var resetPassword = function () {
    loginButtonsSession.resetMessages();
    var newPassword = document.getElementById('reset-password-new-password').value;
    if (!Meteor._loginButtons.validatePassword(newPassword))
      return;

    Accounts.resetPassword(
      loginButtonsSession.get('resetPasswordToken'), newPassword,
      function (error) {
        if (error) {
          loginButtonsSession.set('errorMessage', error.reason || "Unknown error");
        } else {
          loginButtonsSession.set('resetPasswordToken', null);
          Accounts._enableAutoLogin();
        }
      });
  };

  Template.resetPasswordDialog.inResetPasswordFlow = function () {
    return loginButtonsSession.get('resetPasswordToken');
  };


  //
  // enrollAccountDialog template
  //

  Template.enrollAccountDialog.events({
    'click #login-buttons-enroll-account-button': function () {
      enrollAccount();
    },
    'keypress #enroll-account-password': function (event) {
      if (event.keyCode === 13)
        enrollAccount();
    },
    'click #login-buttons-cancel-enroll-account': function () {
      loginButtonsSession.set('enrollAccountToken', null);
      Accounts._enableAutoLogin();
    }
  });

  var enrollAccount = function () {
    loginButtonsSession.resetMessages();
    var password = document.getElementById('enroll-account-password').value;
    if (!Meteor._loginButtons.validatePassword(password))
      return;

    Accounts.resetPassword(
      loginButtonsSession.get('enrollAccountToken'), password,
      function (error) {
        if (error) {
          loginButtonsSession.set('errorMessage', error.reason || "Unknown error");
        } else {
          loginButtonsSession.set('enrollAccountToken', null);
          Accounts._enableAutoLogin();
        }
      });
  };

  Template.enrollAccountDialog.inEnrollAccountFlow = function () {
    return loginButtonsSession.get('enrollAccountToken');
  };


  //
  // justValidatedUserDialog template
  //

  Template.justValidatedUserDialog.events({
    'click #just-validated-dismiss-button': function () {
      loginButtonsSession.set('justValidatedUser', false);
    }
  });

  Template.justValidatedUserDialog.visible = function () {
    return loginButtonsSession.get('justValidatedUser');
  };


  //
  // loginButtonsMessagesDialog template
  //

  Template.loginButtonsMessagesDialog.events({
    'click #messages-dialog-dismiss-button': function () {
      loginButtonsSession.resetMessages();
    }
  });

  Template.loginButtonsMessagesDialog.visible = function () {
    var hasMessage = loginButtonsSession.get('infoMessage') || loginButtonsSession.get('errorMessage');
    return !Meteor._loginButtons.dropdown() && hasMessage;
  };


  //
  // configureLoginServiceDialog template
  //

  Template.configureLoginServiceDialog.events({
    'click #configure-login-service-dismiss-button': function () {
      loginButtonsSession.set('configureLoginServiceDialogVisible', false);
    },
    'click #configure-login-service-dialog-save-configuration': function () {
      if (loginButtonsSession.get('configureLoginServiceDialogVisible')) {
        // Prepare the configuration document for this login service
        var serviceName = loginButtonsSession.get('configureLoginServiceDialogServiceName');
        var configuration = {
          service: serviceName
        };
        _.each(configurationFields(), function(field) {
          configuration[field.property] = document.getElementById(
            'configure-login-service-dialog-' + field.property).value;
        });

        // Configure this login service
        Meteor.call("configureLoginService", configuration, function (error, result) {
          if (error)
            Meteor._debug("Error configurating login service " + serviceName, error);
          else
            loginButtonsSession.set('configureLoginServiceDialogVisible', false);
        });
      }
    },
    'input': function (event) {
      // if the event fired on one of the configuration input fields,
      // check whether we should enable the 'save configuration' button
      if (event.target.id.indexOf('configure-login-service-dialog') === 0)
        updateSaveDisabled();
    }
  });

  // check whether the 'save configuration' button should be enabled.
  // this is a really strange way to implement this and a Forms
  // Abstraction would make all of this reactive, and simpler.
  var updateSaveDisabled = function () {
    var saveEnabled = true;
    _.any(configurationFields(), function(field) {
      if (document.getElementById(
        'configure-login-service-dialog-' + field.property).value === '') {
        saveEnabled = false;
        return true;
      } else {
        return false;
      }
    });

    loginButtonsSession.set('configureLoginServiceDialogSaveEnabled', saveEnabled);
  };

  // Returns the appropriate template for this login service.  This
  // template should be defined in the service's package
  var configureLoginServiceDialogTemplateForService = function () {
    var serviceName = loginButtonsSession.get('configureLoginServiceDialogServiceName');
    return Template['configureLoginServiceDialogFor' + capitalize(serviceName)];
  };

  var configurationFields = function () {
    var template = configureLoginServiceDialogTemplateForService();
    return template.fields();
  };

  Template.configureLoginServiceDialog.configurationFields = function () {
    return configurationFields();
  };

  Template.configureLoginServiceDialog.visible = function () {
    return loginButtonsSession.get('configureLoginServiceDialogVisible');
  };

  Template.configureLoginServiceDialog.configurationSteps = function () {
    // renders the appropriate template
    return configureLoginServiceDialogTemplateForService()();
  };

  Template.configureLoginServiceDialog.saveDisabled = function () {
    return !loginButtonsSession.get('configureLoginServiceDialogSaveEnabled');
  };


  // XXX from http://epeli.github.com/underscore.string/lib/underscore.string.js
  var capitalize = function(str){
    str = str == null ? '' : String(str);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

}) ();