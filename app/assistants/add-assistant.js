var AddAssistant = Class.create(BaseAssistant, {
  initialize: function($super, url, title) {
    $super()
    this.instapaper = new Instapaper()
    this.url = {value: url || ""}
    this.title = {value: title || ""}
    this.button = {buttonLabel: "Add"}
  },

  setup: function($super) {
    $super()
    this.setupWidgets()
    this.setupListeners()
  },

  activate: function($super) {
    $super()
    this.controller.get("title").mojo.setConsumesEnterKey(false)
  },

  cleanup: function($super) {
    $super()
    this.cleanupListeners()
  },

  setupWidgets: function() {
    this.controller.setupWidget("url", {changeOnKeyPress: true, autoFocus: true, textCase: Mojo.Widget.steModeLowerCase}, this.url)
    this.controller.setupWidget("title", {changeOnKeyPress: true, hintText: "Optional"}, this.title)
    this.controller.setupWidget("add", {type: Mojo.Widget.activityButton}, this.button)
  },

  setupListeners: function() {
		this.controller.listen("title", Mojo.Event.propertyChange, this.propertyChanged = this.propertyChanged.bind(this))
    this.controller.listen("add", Mojo.Event.tap, this.add = this.add.bind(this))
  },

  cleanupListeners: function() {
		this.controller.stopListening("title", Mojo.Event.propertyChange, this.propertyChanged)
    this.controller.stopListening("add", Mojo.Event.tap, this.add)
  },

  propertyChanged: function(event) {
    if(Mojo.Char.enter === event.originalEvent.keyCode) {
      this.add()
    }
  },

  add: function() {
    if(!this.button.disabled) {
      this.button.disabled = true
      this.controller.modelChanged(this.button)
      this.controller.get("error").hide()
      this.controller.get("add").mojo.activate()

      if(this.url.value.strip().length) {
        this.instapaper.add(this.url.value, this.title.value, this.addSuccess.bind(this), this.addFailure.bind(this))
      }
      else {
        this.urlRequired()
      }
    }
  },

  addSuccess: function() {
    this.controller.stageController.popScene("refresh")
  },

  addFailure: function() {
    this.showError("Add failed")
  },

  urlRequired: function() {
    this.showError("URL is required")
  },

  showError: function(message) {
    this.controller.get("error-message").update(message)
    this.controller.get("error").show()
    this.controller.get("add").mojo.deactivate()
    this.button.disabled = false
    this.controller.modelChanged(this.button)
  }
})