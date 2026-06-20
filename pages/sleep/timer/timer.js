var H = require('../../../utils/helpers')

Page({
  data: {
    isRunning: false,
    elapsedSeconds: 0,
    timerDisplay: '00:00',
    _timer: null
  },

  onUnload: function () {
    this.clearTimer()
  },

  toggleTimer: function () {
    if (this.data.isRunning) {
      this.stopTimer()
    } else {
      this.startTimer()
    }
  },

  startTimer: function () {
    var self = this
    this.setData({ isRunning: true, elapsedSeconds: 0, timerDisplay: '00:00' })
    this.data._timer = setInterval(function () {
      var elapsed = self.data.elapsedSeconds + 1
      var m = Math.floor(elapsed / 60)
      var s = elapsed % 60
      self.setData({
        elapsedSeconds: elapsed,
        timerDisplay: H.pad2(m) + ':' + H.pad2(s)
      })
    }, 1000)
  },

  stopTimer: function () {
    var self = this
    this.clearTimer()

    var durationSeconds = self.data.elapsedSeconds
    if (durationSeconds < 10) {
      wx.showToast({ title: '记录时间太短', icon: 'none' })
      self.setData({ isRunning: false, elapsedSeconds: 0, timerDisplay: '00:00' })
      return
    }

    var now = new Date()
    var startMs = now.getTime() - durationSeconds * 1000
    var sd = new Date(startMs)
    var ed = now
    var startTime = sd.getFullYear() + '-' + H.pad2(sd.getMonth() + 1) + '-' + H.pad2(sd.getDate()) + 'T' + H.pad2(sd.getHours()) + ':' + H.pad2(sd.getMinutes()) + ':00'
    var endTime = ed.getFullYear() + '-' + H.pad2(ed.getMonth() + 1) + '-' + H.pad2(ed.getDate()) + 'T' + H.pad2(ed.getHours()) + ':' + H.pad2(ed.getMinutes()) + ':00'
    var durMin = Math.round(durationSeconds / 60)

    wx.redirectTo({
      url: '/pages/sleep/add/add?from=timer&startTime=' + encodeURIComponent(startTime) + '&endTime=' + encodeURIComponent(endTime) + '&duration=' + durMin
    })
  },

  clearTimer: function () {
    if (this.data._timer) {
      clearInterval(this.data._timer)
      this.data._timer = null
    }
  },

  goBack: function () {
    wx.navigateBack()
  }
})
