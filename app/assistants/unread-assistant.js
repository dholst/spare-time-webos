var UnreadAssistant = Class.create(BaseAssistant, {
  initialize: function($super) {
    $super()
    this.instapaper = new Instapaper()
    this.unread = {items: []}
    this.firstTime = true
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget("unread", {itemTemplate: 'unread/unread-item'}, this.unread)
    this.controller.listen("unread", Mojo.Event.listTap, this.itemTapped = this.itemTapped.bind(this))
    this.controller.listen("refresh", Mojo.Event.tap, this.refresh = this.refresh.bind(this))
  },

  cleanup: function($super) {
    $super()
    this.controller.stopListening("unread", Mojo.Event.listTap, this.itemTapped)
  },

  activate: function($super, refresh) {
    $super()
    if(refresh || this.firstTime) this.refresh()
  },

  itemsRetrieved: function(unreadItems) {
    this.unread.items.clear()
    this.unread.items.push.apply(this.unread.items, unreadItems)
    this.controller.modelChanged(this.unread)
    this.spinnerOff()
  },

  retrieveFailure: function() {
    console.log("WTF")
  },

  itemTapped: function(event) {
    this.controller.stageController.pushScene("text", event.item)
  },

  refresh: function() {
    this.firstTime = false
    this.spinnerOn("getting unread articles...")
    this.instapaper.getAllUnread(this.itemsRetrieved.bind(this), this.retrieveFailure.bind(this))
  }
})