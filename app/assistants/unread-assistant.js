var UnreadAssistant = Class.create(BaseAssistant, {
  activate: function($super) {
    $super()
    this.spinnerOn("getting unread articles...")
  }
})