var BaseItemsAssistant = Class.create(BaseAssistant, {
  initialize: function($super) {
    $super()
    this.instapaper = new Instapaper()
    this.items = {items: []}
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget("items", {itemTemplate: 'items/item', onItemRendered: this.itemRendered.bind(this)}, this.items)
    this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [this.getLeftSideCommand(), {}, {label: "Refresh", icon: "refresh", command: "refresh"}]})
    this.controller.listen("items", Mojo.Event.listTap, this.itemTapped = this.itemTapped.bind(this))
    this.controller.listen("switch", Mojo.Event.tap, this.swapScene = this.swapScene.bind(this))
  },

  cleanup: function($super) {
    $super()
    this.controller.stopListening("items", Mojo.Event.listTap, this.itemTapped)
    this.controller.stopListening("switch", Mojo.Event.tap, this.swapScene)
  },

  ready: function($super) {
    $super()
    this.refresh()
  },

  activate: function($super, itemToRemove) {
    if(itemToRemove) {
      for(var i = 0; i < this.items.items.length; i++) {
        if(this.items.items[i] == itemToRemove) {
          this.items.items.splice(i, 1)
          this.controller.modelChanged(this.items)
        }
      }
    }
  },

  itemsRetrieved: function(items) {
    this.items.items.clear()
    this.items.items.push.apply(this.items.items, items)
    this.controller.modelChanged(this.items)
    this.spinnerOff()
  },

  retrieveFailure: function() {
    this.spinnerOff()
    this.controller.stageController.pushScene("bail", "Unable to retrieve items")
  },

  itemTapped: function(event) {
    if(event.originalEvent.target.hasClassName('star')) {
      event.originalEvent.target.toggleClassName('on')
      new Ajax.Request(event.item.starUrl, {method: 'get'})
    }
    else if(event.item.url) {
      this.controller.stageController.pushScene("text", event.item)
    }
  },

  handleCommand: function($super, event) {
    if("refresh" == event.command) {
      this.refresh()
    }
    else {
      $super(event)
    }
  },

  swapScene: function() {
    items = []

    this.otherScenes.each(function(scene) {
      items.push({label: scene.capitalize(), command: scene})
    })

    this.controller.popupSubmenu({
      placeNear: $("switch"),
      items: items,

      onChoose: function(command) {
        if(command) {
          this.controller.stageController.swapScene(command)
        }
      }.bind(this)
    })
  },

  refresh: function() {
    this.firstTime = false
    this.spinnerOn("retrieving articles...")
    this.retrieveItems(this.itemsRetrieved.bind(this), this.retrieveFailure.bind(this))
  },
  
  getLeftSideCommand: function() {
    return {}
  },
  
  itemRendered: function() {
  }
})