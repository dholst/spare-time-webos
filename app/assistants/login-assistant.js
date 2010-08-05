var LoginAssistant = Class.create(BaseAssistant, {
  initialize: function(credentials) {
    this.credentials = credentials || new Credentials()
    this.instapaper = new Instapaper()
  },

  activate: function($super) {
    $super()

    if(this.credentials.username) {
      this.spinnerOn("logging in...")
      this.instapaper.login(this.credentials, this.loginSuccess.bind(this), this.loginFailure.bind(this))
    }
    else {
      this.controller.stageController.swapScene("credentials", this.credentials)
    }
  },

  loginSuccess: function() {
    this.credentials.save()
    this.controller.stageController.swapScene("unread")
  },

  loginFailure: function() {
    this.controller.stageController.swapScene("credentials", this.credentials)
  }
})