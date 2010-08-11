BailAssistant = Class.create(BaseAssistant, {
  initialize: function(message, nextScene) {
    this.message = message
    this.nextScene = nextScene
  },

  setup: function($super) {
    $super()
    var message = this.message

    if(this.nextScene) {
      message += ('<div id="bail-action" class="palm-button">Try Again</div>')
    }

    $$('.fullscreen-message').first().update(message)

    if(this.nextScene) {
      this.controller.listen("bail-action", Mojo.Event.tap, this.bailAction = this.bailAction.bind(this))
    }
  },

  bailAction: function() {
    this.controller.stopListening("bail-action", Mojo.Event.tap, this.bailAction)
    this.controller.stageController.swapScene(this.nextScene)
  }
})
