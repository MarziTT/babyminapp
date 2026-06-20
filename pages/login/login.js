var { login } = require('../../utils/api')
var { setOpenId, getOpenId, setFamilyId, getFamilyId, setMyRole } = require('../../utils/baby')

Page({
  data: {
    loading: false,
    error: ''
  },

  onLoad: function () {
    // 检查是否已登录
    var openid = getOpenId()
    if (openid) {
      this.goHome()
    }
  },

  onGetUserInfo: function (e) {
    var self = this
    var userInfo = e.detail.userInfo
    if (!userInfo) {
      self.setData({ error: '需要授权才能使用' })
      return
    }

    self.setData({ loading: true, error: '' })

    wx.login({
      success: function (loginRes) {
        if (!loginRes.code) {
          self.setData({ loading: false, error: '获取登录凭证失败' })
          return
        }

        login(loginRes.code, userInfo.nickName, userInfo.avatarUrl)
          .then(function (res) {
            // 存储 openid
            setOpenId(res.openid)
            wx.setStorageSync('userInfo', {
              nickname: res.nickname || userInfo.nickName,
              avatarUrl: res.avatarUrl || userInfo.avatarUrl
            })

            // 如果有家庭，存储 familyId 和 role
            if (res.family) {
              setFamilyId(res.family.family_id)
              setMyRole(res.family.role)
            }

            self.setData({ loading: false })
            wx.showToast({ title: '登录成功', icon: 'success', duration: 1200 })
            setTimeout(function () {
              self.goHome()
            }, 1200)
          })
          .catch(function (err) {
            console.error('[Login] error:', err)
            self.setData({
              loading: false,
              error: err.message || '登录失败，请重试'
            })
          })
      },
      fail: function () {
        self.setData({ loading: false, error: '微信登录失败' })
      }
    })
  },

  onSkip: function () {
    // 体验模式：生成本地 ID
    var demoId = 'demo_' + Date.now()
    setOpenId(demoId)
    wx.setStorageSync('userInfo', {
      nickname: '体验用户',
      avatarUrl: ''
    })
    wx.showToast({ title: '进入体验模式', icon: 'none', duration: 1000 })
    setTimeout(function () {
      wx.switchTab({ url: '/pages/index/index' })
    }, 1000)
  },

  goHome: function () {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
