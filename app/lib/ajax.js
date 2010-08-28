function ajaxTimeout(request) {
  request.transport.abort()
  Mojo.Log.info("ajax request timed out")
}

Ajax.Responders.register({
  onCreate: function(request) {
    Mojo.Log.info("ajax request started,", request.method, request.url)

    if(request.options.timeout) {
      request.timeoutId = setTimeout(ajaxTimeout.curry(request), request.options.timeout)
    }
  },

  onComplete: function(response) {
    Mojo.Log.info("ajax request completed, status:", response.getStatus(), "success:", response.success())
    clearTimeout(response.timeoutId)
  },

  onException: function(request, exception) {
    Mojo.Log.info("ajax exception -", exception.message)
  }
})

Ajax.Request.prototype.success = function() {
  var status = this.getStatus()
  return (status >= 200 && status < 300)
}