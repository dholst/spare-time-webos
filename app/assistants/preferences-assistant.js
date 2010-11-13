var PreferencesAssistant = Class.create(BaseAssistant, {
  initialize: function($super) {
    $super()
    this.hidePreferences = true

    this.allowLandscape = {value: Preferences.allowLandscape()}
    this.originalAllowLandscape = Preferences.allowLandscape()

    this.fontSize = {value: Preferences.fontSize()}
    this.originalFontSize = Preferences.fontSize()
  },

  setup: function($super) {
    $super()

    var fontSizeChoices = {choices: [
      {label: $L("Small Font"), value: "small"},
      {label: $L("Medium Font"), value: "medium"},
      {label: $L("Large Font"), value: "large"}
    ]}

    this.controller.setupWidget("allow-landscape", {}, this.allowLandscape)
    this.controller.listen("allow-landscape", Mojo.Event.propertyChange, this.setAllowLandscape = this.setAllowLandscape.bind(this))

    this.controller.setupWidget("font-size", fontSizeChoices, this.fontSize)
    this.controller.listen("font-size", Mojo.Event.propertyChange, this.setFontSize = this.setFontSize.bind(this))
  },

  cleanup: function($super) {
    $super()
    this.controller.stopListening("allow-landscape", Mojo.Event.propertyChange, this.setAllowLandscape)
    this.controller.stopListening("font-size", Mojo.Event.propertyChange, this.setFontSize)
  },

  setAllowLandscape: function() {
    Preferences.setAllowLandscape(this.allowLandscape.value)
  },

  setFontSize: function() {
    Preferences.setFontSize(this.fontSize.value)
  },

  handleCommand: function($super, event) {
    if(Mojo.Event.back == event.type) {
      event.stop();

      var changes = {}

      if(this.originalAllowLandscape != Preferences.allowLandscape()) {
        changes.allowLandscapeChanged = true
      }

      if(this.originalFontSize != Preferences.fontSize()) {
        changes.fontSizeChanged = true
      }

      this.controller.stageController.popScene(changes)
    }
    else {
      $super(event)
    }
  }
})
