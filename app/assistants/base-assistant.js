var BaseAssistant = Class.create({
  initialize: function() {
    this.appMenuItems = []
    this.appMenuItems.push(Mojo.Menu.editItem)
    if(!this.hidePreferences) this.appMenuItems.push({label: "Preferences", command: "preferences"})
    this.appMenuItems.push({label: "Logout", command: "logout"})
    this.appMenuItems.push({label: "Help", command: Mojo.Menu.helpCmd})
  },

  setup: function() {
    this.controller.setupWidget("spinner", {spinnerSize: Mojo.Widget.spinnerLarge}, {})

    this.controller.setupWidget(
      Mojo.Menu.appMenu,
      {omitDefaultItems: true},
      {visible: true, items: this.appMenuItems}
    )
  },

  ready: function() {
  },

  activate: function() {
    this.controller.stageController.setWindowOrientation(Preferences.allowLandscape() ? "free" : "up")
  },

  deactivate: function() {
  },

  cleanup: function() {
  },

  spinnerOn: function(message) {
    var spinner = this.controller.sceneElement.querySelector(".spinner")
    spinner.mojo.start()
    this.controller.get("spinner-scrim").show()

    var spinnerMessage = this.controller.get("spinner-message")

    if(!spinnerMessage) {
      spinner.insert({after: '<div id="spinner-message" class="spinner-message palm-info-text"></div>'})
      spinnerMessage = this.controller.get("spinner-message")
    }

    spinnerMessage.update(message || "")
  },

  spinnerOff: function() {
    var message = this.controller.get("spinner-message")

    if(message) {
      message.remove()
      this.controller.sceneElement.querySelector(".spinner").mojo.stop()
      this.controller.get("spinner-scrim").hide()
    }
  },

  handleCommand: function(event) {
    if(Mojo.Event.command === event.type) {
      if(Mojo.Menu.helpCmd == event.command) {
        this.controller.stageController.pushScene("help")
        event.stop()
      }
      else if("preferences" == event.command) {
        this.controller.stageController.pushScene("preferences")
        event.stop()
      }
      else if("logout" == event.command) {
        var creds = new Credentials()
        creds.username = null
        creds.password = null
        creds.save()
        this.controller.stageController.swapScene("login")
      }
      else if("add" == event.command) {
        this.controller.stageController.pushScene("add")
      }
    }
  }
})
