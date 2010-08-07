var UnreadAssistant = Class.create(BaseAssistant, {
  initialize: function($super) {
    $super()
    this.instapaper = new Instapaper()
    this.unread = {items: []}
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget("unread", {itemTemplate: 'unread/unread-item'}, this.unread)
    this.controller.listen("unread", Mojo.Event.listTap, this.itemTapped = this.itemTapped.bind(this))
  },

  cleanup: function($super) {
    $super()
    this.controller.stopListening("unread", Mojo.Event.listTap, this.itemTapped)
  },

  activate: function($super) {
    $super()
    this.spinnerOn("getting unread articles...")
    this.instapaper.getAllUnread(this.itemsRetrieved.bind(this), this.retrieveFailure.bind(this))
  },

  itemsRetrieved: function(unreadItems) {
    this.unread.items.push.apply(this.unread.items, unreadItems)
    this.controller.modelChanged(this.unread)
    this.spinnerOff()
  },

  retrieveFailure: function() {
    console.log("WTF")
  },

  itemTapped: function(event) {
    this.controller.stageController.pushScene("text", event.item)
  }
})