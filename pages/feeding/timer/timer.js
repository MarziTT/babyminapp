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

    var pages = getCurrentPages()
    var prevPage = pages[pages.length - 2]
    if (prevPage && typeof prevPage.onTimerResult === 'function') {
      prevPage.onTimerResult(durationSeconds)
    }
    wx.navigateBack()
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