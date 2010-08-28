var DataStore = {
  initialize: function(onSuccess, onFailure) {
    onFailure = onFailure || Prototype.emptyFunction()
    console.log("initializing datastore")

    this.depot = new Mojo.Depot(
      {name: "ext:sparetime", version: 1, replace: false},

      function() {
        console.log("datastore initialized")
        onSuccess()
      },

      function() {
        console.log("could not initialize datastore")
        onFailure()
      }
    )
  },

  get: function(name, callback, defaultValue) {
    console.log("retrieving " + name + " from the datastore")

    var onSuccess = function(value) {
      console.log("retrieved " + value)

      if(value == null && defaultValue != null) {
        console.log("defaulting " + name + " to " + defaultValue)
        this.add(name, defaultValue, callback)
      }
      else {
        callback(value)
      }
    }.bind(this)

    var onFailure = function() {
      throw "depot get failure"
    }

    this.depot.get(name, onSuccess, onFailure)
  },

  add: function(name, value, callback) {
    callback = callback || function() {}
    console.log("adding " + name + " to the datastore")

    var onSuccess = function() {
      console.log(name + " added to the datastore")
      callback(value)
    }

    var onFailure = function() {
      throw "depot add failure"
    }

    this.depot.add(name, value, onSuccess, onFailure)
  }
}
