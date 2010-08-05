var LoginAssistant = Class.create(BaseAssistant, {
  initialize: function(credentials) {
    this.credentials = credentials || new Credentials()
  },

  setup: function($super) {
    $super()

    if(!this.credentials.username) {
      this.controller.stageController.swapScene("credentials", this.credentials)
    }
  },

  activate: function($super) {
    $super()
    this.spinnerOn("logging in...")
  }
})