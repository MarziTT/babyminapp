var { aiChat } = require('../../utils/api')
var H = require('../../utils/helpers')

Page({
  data: {
    messages: [],
    inputValue: '',
    isSending: false,
  },

  onLoad: function() {
    this.setData({
      messages: [{
        role: 'assistant',
        content: '你好！我是你的育儿顾问，关于宝宝喂养、睡眠、发育等问题，随时问我～',
        time: this.now()
      }]
    })
  },

  now: function() {
    var d = new Date()
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + H.pad2(d.getHours()) + ':' + H.pad2(d.getMinutes())
  },

  onInput: function(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onSend: function() {
    var self = this
    var value = this.data.inputValue.trim()
    if (!value || this.data.isSending) return

    var userMsg = { role: 'user', content: value, time: this.now() }
    this.setData({
      messages: this.data.messages.concat([userMsg]),
      inputValue: '',
      isSending: true,
    })

    var context = self.data.messages.map(function (m) { return { role: m.role, content: m.content } })
    aiChat(value, context).then(function(result) {
      var reply = { role: 'assistant', content: result.reply || result, time: self.now() }
      self.setData({
        messages: self.data.messages.concat([reply]),
        isSending: false,
      })
      wx.pageScrollTo({ scrollTop: 99999, duration: 200 })
    }).catch(function(err) {
      var msgs = self.data.messages
      msgs.pop()
      self.setData({ messages: msgs, inputValue: value, isSending: false })
      var msg = (err && err.message) || 'AI 暂时无法回复'
      wx.showToast({ title: msg, icon: 'none' })
    })
  },

  onQuickAsk: function(e) {
    var question = e.currentTarget.dataset.q
    this.setData({ inputValue: question })
    this.onSend()
  },
})
