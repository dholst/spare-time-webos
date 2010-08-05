var UnreadAssistant = Class.create(BaseAssistant, {
  initialize: function($super) {
    $super()
    this.instapaper = new Instapaper()
    this.unread = {items: []}
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget("unread", {itemTemplate: 'unread/unread-item'}, this.unread)
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
  }
})