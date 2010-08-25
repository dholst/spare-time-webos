var BaseItemsAssistant = Class.create(BaseAssistant, {
  initialize: function($super) {
    $super()
    this.instapaper = new Instapaper()
    this.items = {items: []}
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget("items", {itemTemplate: 'items/item'}, this.items)
    this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "...", command: "switch"}, {}, {label: "Refresh", icon: "refresh", command: "refresh"}]})
    this.controller.listen("items", Mojo.Event.listTap, this.itemTapped = this.itemTapped.bind(this))
  },

  cleanup: function($super) {
    $super()
    this.controller.stopListening("items", Mojo.Event.listTap, this.itemTapped)
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
    else if("switch" == event.command) {
      this.switchScene(event)
    }
    else {
      $super(event)
    }
  },

  switchScene: function(event) {
    sceneSelections = []

    this.otherScenes.each(function(scene) {
      sceneSelections.push({label: scene.capitalize(), command: scene})
    })

    this.controller.popupSubmenu({
      placeNear: event.originalEvent.target,
      items: sceneSelections,

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
  }
})