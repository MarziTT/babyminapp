var { createMedication } = require('../../utils/api')
var { getFamilyId, getOpenId, getBabyId } = require('../../utils/baby')

Page({
  data: {
    duration: 0,
    remaining: 0,
    isRunning: false,
    isPaused: false,
    isFinished: false,
    presets: [5, 10, 15, 20, 30],
    selectedPreset: -1,
    customMinutes: '',
    medicineName: '',
    bodyArea: '',
    showSaveForm: false,
    minDisplay: '00',
    secDisplay: '00'
  },

  _intervalId: null,
  _startTime: 0,
  _initialRemaining: 0,
  _audioCtx: null,

  onLoad: function () {
    this._audioCtx = wx.createInnerAudioContext()
    this._audioCtx.src = '/assets/audio/timer-done.mp3'
  },

  onUnload: function () {
    this.clearTimer()
    if (this._audioCtx) {
      this._audioCtx.destroy()
    }
  },

  selectPreset: function (e) {
    var index = e.currentTarget.dataset.index
    var minutes = e.currentTarget.dataset.minutes
    var seconds = minutes * 60
    this.setData({
      duration: seconds,
      remaining: seconds,
      selectedPreset: index,
      customMinutes: '',
      isFinished: false,
      showSaveForm: false
    })
    this.setDisplayFromDuration()
    this.clearTimer()
  },

  onCustomInput: function (e) {
    var val = e.detail.value
    this.setData({ customMinutes: val })
    if (val && !isNaN(val) && Number(val) > 0) {
      var seconds = Math.floor(Number(val) * 60)
      this.setData({
        duration: seconds,
        remaining: seconds,
        selectedPreset: -1,
        isFinished: false,
        showSaveForm: false
      })
      this.setDisplayFromDuration()
      this.clearTimer()
    }
  },

  startTimer: function () {
    if (this.data.remaining <= 0) {
      wx.showToast({ title: '请先选择时长', icon: 'none' })
      return
    }
    this._startTime = Date.now()
    this._initialRemaining = this.data.remaining
    this.setData({ isRunning: true, isPaused: false, isFinished: false, showSaveForm: false })
    this.runTick()
  },

  pauseTimer: function () {
    this.clearTimer()
    this.setData({ isRunning: false, isPaused: true })
  },

  resumeTimer: function () {
    if (this.data.remaining <= 0) return
    this._startTime = Date.now()
    this._initialRemaining = this.data.remaining
    this.setData({ isRunning: true, isPaused: false })
    this.runTick()
  },

  resetTimer: function () {
    this.clearTimer()
    this.setData({
      remaining: this.data.duration,
      isRunning: false,
      isPaused: false,
      isFinished: false,
      showSaveForm: false
    })
    this.setDisplayFromDuration()
  },

  runTick: function () {
    var self = this
    this.clearTimer()
    this._intervalId = setInterval(function () {
      self.tick()
    }, 200)
  },

  tick: function () {
    var elapsed = (Date.now() - this._startTime) / 1000
    var remaining = Math.max(0, Math.ceil(this._initialRemaining - elapsed))
    var disp = this.secToDisplay(remaining)

    this.setData({
      remaining: remaining,
      minDisplay: disp.min,
      secDisplay: disp.sec
    })

    if (remaining <= 0) {
      this.finishTimer()
    }
  },

  finishTimer: function () {
    this.clearTimer()
    this.setData({ isRunning: false, isFinished: true, remaining: 0 })

    wx.vibrateLong({
      success: function () {},
      fail: function () {}
    })

    var self = this
    wx.showModal({
      title: '时间到',
      content: '本次护理计时已结束，是否需要记录涂药信息？',
      confirmText: '记录',
      cancelText: '关闭',
      success: function (res) {
        if (res.confirm) {
          self.setData({ showSaveForm: true })
        }
      }
    })

    if (this._audioCtx) {
      this._audioCtx.play()
    }
  },

  clearTimer: function () {
    if (this._intervalId) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
  },

  onMedicineInput: function (e) {
    this.setData({ medicineName: e.detail.value })
  },

  onAreaInput: function (e) {
    this.setData({ bodyArea: e.detail.value })
  },

  saveRecord: function () {
    var self = this
    var familyId = getFamilyId()
    var openid = getOpenId()

    if (!this.data.medicineName.trim() && !this.data.bodyArea.trim()) {
      wx.showToast({ title: '请至少填写药膏名称或部位', icon: 'none' })
      return
    }

    var durationMinutes = Math.round(this.data.duration / 60)
    var data = {
      baby_id: getBabyId() || '',
      family_id: familyId || '',
      recorded_by: openid || '',
      medicine_name: this.data.medicineName.trim() || '外用护理',
      dosage: String(durationMinutes),
      unit: '分钟',
      note: this.data.bodyArea.trim() || '',
      start_time: '',
      end_time: '',
      frequency: ''
    }

    createMedication(data)
      .then(function () {
        wx.showToast({ title: '已保存', icon: 'success' })
        self.setData({ showSaveForm: false, medicineName: '', bodyArea: '' })
      })
      .catch(function () {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      })
  },

  skipSave: function () {
    this.setData({ showSaveForm: false, medicineName: '', bodyArea: '' })
  },

  formatTime: function (seconds) {
    if (seconds == null || isNaN(seconds)) return '00:00'
    var s = Math.max(0, Math.ceil(seconds))
    var m = Math.floor(s / 60)
    var sec = s % 60
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec
  },

  secToDisplay: function (seconds) {
    var s = Math.max(0, Math.ceil(seconds || 0))
    var m = Math.floor(s / 60)
    var sec = s % 60
    return {
      min: (m < 10 ? '0' : '') + m,
      sec: (sec < 10 ? '0' : '') + sec
    }
  },

  setDisplayFromDuration: function () {
    var d = this.secToDisplay(this.data.duration || 0)
    this.setData({ minDisplay: d.min, secDisplay: d.sec })
  }
})
