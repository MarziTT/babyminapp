var { createFamily, joinFamily, getFamilyMembers, getBabies, createBaby, updateBaby, deleteBaby, getFamilyPermissions, updateFamilyPermissions, uploadAvatar } = require('../../utils/api')
var { getOpenId, getFamilyId, setFamilyId, getMyRole, setMyRole, getActiveBaby, setActiveBaby, isDemoUser } = require('../../utils/baby')

/**
 * 根据生日计算年龄描述文本
 * birthday: "YYYY-MM-DD" 格式
 * today: Date 对象
 */
function calcBabyAgeText(birthday, today) {
  if (!birthday) return ''
  var parts = birthday.split('-')
  if (parts.length !== 3) return ''
  var birthYear = parseInt(parts[0])
  var birthMonth = parseInt(parts[1])
  var birthDay = parseInt(parts[2])
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return ''

  var nowYear = today.getFullYear()
  var nowMonth = today.getMonth() + 1
  var nowDay = today.getDate()

  // 计算总月份差
  var totalMonths = (nowYear - birthYear) * 12 + (nowMonth - birthMonth)
  if (nowDay < birthDay) totalMonths -= 1

  if (totalMonths < 0) return '即将出生'

  var years = Math.floor(totalMonths / 12)
  var months = totalMonths % 12

  // 计算天数差（从上次月整点）
  var lastMonthYear = nowYear
  var lastMonthMonth = nowMonth - 1
  if (lastMonthMonth === 0) {
    lastMonthYear -= 1
    lastMonthMonth = 12
  }
  var daysInLastMonth = new Date(lastMonthYear, lastMonthMonth, 0).getDate()
  var cmpDay = Math.min(birthDay, daysInLastMonth)
  var refDate = new Date(lastMonthYear, lastMonthMonth - 1, cmpDay)
  var diffDays = Math.floor((today - refDate) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) diffDays = 0

  if (years > 0) {
    return months > 0 ? years + '岁' + months + '个月' : years + '岁'
  } else if (months > 0) {
    return diffDays > 0 ? months + '个月' + diffDays + '天' : months + '个月'
  } else {
    // 计算总天数
    var birthDate = new Date(birthYear, birthMonth - 1, birthDay)
    var totalDays = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24))
    if (totalDays < 0) totalDays = 0
    return totalDays + '天'
  }
}

Page({
  data: {
    openid: '',
    familyId: '',
    babyName: '宝宝',
    babyBirthday: '',
    babyAvatar: '',
    userAvatar: '',
    identityGreeting: '宝宝',
    babyAgeText: '',
    myRole: '',
    members: [],
    hasFamily: false,
    loading: true,

    // 创建表单
    showCreate: false,
    inputBabyName: '',
    inputBirthday: '',
    inputBabyGender: 'male',
    inputRole: '',

    // 加入表单
    showJoin: false,
    inputFamilyId: '',
    inputJoinRole: '',

    // 宝宝管理
    babies: [],
    showBabyForm: false,
    editBaby: null,
    babyFormName: '',
    babyFormBirthday: '',
    babyFormGender: 'male',
    babyFormAvatar: '',

    // 成员权限
    showMemberMenu: false,
    memberMenuOpenid: '',
    memberMenuRole: '',
    memberMenuNickname: ''
  },

  onLoad: function () {
    var openid = getOpenId()
    var familyId = getFamilyId()
    this.setData({ openid: openid, familyId: familyId, myRole: getMyRole(), isDemo: isDemoUser() })
    this.loadFamily()
  },

  onShow: function () {
    this.loadFamily()
  },

  loadFamily: function () {
    var self = this
    var openid = getOpenId()
    if (!openid) {
      self.setData({ loading: false, hasFamily: false })
      return
    }

    getFamilyMembers(openid)
      .then(function (res) {
        var myRole = res.myRole || ''
        var babyName = res.babyName || '宝宝'
        var roleLabel = myRole === 'mom' ? '妈妈' : myRole === 'dad' ? '爸爸' : ''
        var identityGreeting = roleLabel ? babyName + '的' + roleLabel : babyName
        var babyBirthday = res.babyBirthday || ''

        // 计算年龄
        var ageText = calcBabyAgeText(babyBirthday, new Date())

        // 从家庭成员列表中取自己的头像
        var members = res.members || []
        var userAvatar = ''
        for (var i = 0; i < members.length; i++) {
          if (members[i].openid === openid && members[i].avatar_url) {
            userAvatar = members[i].avatar_url
            break
          }
        }
        if (!userAvatar) {
          var userInfo = wx.getStorageSync('userInfo')
          if (userInfo && userInfo.avatarUrl) userAvatar = userInfo.avatarUrl
        }

        self.setData({
          familyId: res.familyId,
          babyName: babyName,
          babyBirthday: babyBirthday,
          babyAvatar: res.babyAvatar || '',
          userAvatar: userAvatar,
          identityGreeting: identityGreeting,
          babyAgeText: ageText,
          myRole: myRole,
          members: members,
          babies: res.babies || [],
          hasFamily: true,
          loading: false
        })
        setFamilyId(res.familyId)
        setMyRole(res.myRole)
      })
      .catch(function () {
        self.setData({ loading: false, hasFamily: false })
      })
  },

  // ========== 创建家庭 ==========
  onShowCreate: function () {
    if (isDemoUser()) {
      wx.showToast({ title: '体验模式无法创建家庭，请先登录微信', icon: 'none', duration: 2000 })
      return
    }
    this.setData({ showCreate: true, showJoin: false, inputBabyGender: 'male' })
  },

  onHideCreate: function () {
    this.setData({ showCreate: false })
  },

  onBabyNameInput: function (e) {
    this.setData({ inputBabyName: e.detail.value })
  },

  onBirthdayChange: function (e) {
    this.setData({ inputBirthday: e.detail.value })
  },

  onSelectCreateGender: function (e) {
    this.setData({ inputBabyGender: e.currentTarget.dataset.gender })
  },

  onSelectCreateRole: function (e) {
    this.setData({ inputRole: e.currentTarget.dataset.role })
  },

  onCreateFamily: function () {
    var self = this
    var openid = getOpenId()
    if (isDemoUser()) {
      wx.showToast({ title: '体验模式无法创建家庭，请先登录微信', icon: 'none', duration: 2000 })
      return
    }
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    var role = self.data.inputRole || 'mom'
    createFamily(openid, self.data.inputBabyName || '宝宝', self.data.inputBirthday, '', role, self.data.inputBabyGender || 'male')
      .then(function (res) {
        setFamilyId(res.familyId)
        setMyRole(res.role)
        wx.showToast({ title: '家庭创建成功', icon: 'success' })
        self.setData({ showCreate: false })
        self.loadFamily()
      })
      .catch(function (err) {
        wx.showToast({ title: err.message || '创建失败', icon: 'none' })
      })
  },

  // ========== 加入家庭 ==========
  onShowJoin: function () {
    if (isDemoUser()) {
      wx.showToast({ title: '体验模式无法加入家庭，请先登录微信', icon: 'none', duration: 2000 })
      return
    }
    this.setData({ showJoin: true, showCreate: false })
  },

  onHideJoin: function () {
    this.setData({ showJoin: false })
  },

  onFamilyIdInput: function (e) {
    this.setData({ inputFamilyId: e.detail.value })
  },

  onSelectJoinRole: function (e) {
    this.setData({ inputJoinRole: e.currentTarget.dataset.role })
  },

  onJoinFamily: function () {
    var self = this
    var openid = getOpenId()
    var familyId = (self.data.inputFamilyId || '').trim()

    if (isDemoUser()) {
      wx.showToast({ title: '体验模式无法加入家庭，请先登录微信', icon: 'none', duration: 2000 })
      return
    }
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!familyId) {
      wx.showToast({ title: '请输入家庭码', icon: 'none' })
      return
    }

    joinFamily(openid, familyId, self.data.inputJoinRole || 'other')
      .then(function (res) {
        setFamilyId(res.familyId)
        setMyRole(res.role)
        wx.showToast({ title: '加入成功', icon: 'success' })
        self.setData({ showJoin: false, inputFamilyId: '' })
        self.loadFamily()
      })
      .catch(function (err) {
        wx.showToast({ title: err.message || '加入失败', icon: 'none' })
      })
  },

  // ========== 复制家庭码 ==========
  onCopyCode: function () {
    wx.setClipboardData({
      data: this.data.familyId,
      success: function () {
        wx.showToast({ title: '已复制，分享给对方即可', icon: 'success' })
      }
    })
  },

  // ========== 角色映射 ==========
  getRoleLabel: function (role) {
    if (role === 'mom') return '妈妈'
    if (role === 'dad') return '爸爸'
    return '其他'
  },

  getRoleEmoji: function (role) {
    if (role === 'mom') return '👩'
    if (role === 'dad') return '👨'
    return '👤'
  },

  // ========== 返回首页 ==========
  goHome: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  // ========== 宝宝管理 ==========

  onShowBabyForm: function (e) {
    var id = e.currentTarget.dataset.id
    if (id) {
      var baby = this.data.babies.find(function (b) { return b.id === id })
      if (baby) {
        this.setData({
          showBabyForm: true,
          editBaby: baby,
          babyFormName: baby.name || '',
          babyFormBirthday: baby.birthday || '',
          babyFormGender: baby.gender || 'male',
          babyFormAvatar: baby.avatar || ''
        })
        return
      }
    }
    this.setData({
      showBabyForm: true,
      editBaby: null,
      babyFormName: '',
      babyFormBirthday: '',
      babyFormGender: 'male',
      babyFormAvatar: ''
    })
  },

  onHideBabyForm: function () {
    this.setData({ showBabyForm: false })
  },

  onBabyFormNameInput: function (e) {
    this.setData({ babyFormName: e.detail.value })
  },

  onBabyFormBirthdayChange: function (e) {
    this.setData({ babyFormBirthday: e.detail.value })
  },

  onBabyFormGenderTap: function (e) {
    this.setData({ babyFormGender: e.currentTarget.dataset.gender })
  },

  onBabyFormAvatarTap: function () {
    var self = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var filePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })
        uploadAvatar(filePath).then(function (data) {
          wx.hideLoading()
          self.setData({ babyFormAvatar: data.url || '' })
          wx.showToast({ title: '头像已上传', icon: 'success' })
        }).catch(function (err) {
          wx.hideLoading()
          wx.showToast({ title: err.message || '上传失败', icon: 'none' })
        })
      }
    })
  },

  onSubmitBaby: function () {
    var self = this

    if (isDemoUser()) {
      wx.showToast({ title: '体验模式无法添加宝宝，请先登录微信', icon: 'none', duration: 2000 })
      return
    }

    var familyId = self.data.familyId
    if (!familyId) {
      wx.showToast({ title: '请先创建家庭', icon: 'none' })
      return
    }

    var payload = {
      name: self.data.babyFormName || '宝宝',
      birthday: self.data.babyFormBirthday || '',
      gender: self.data.babyFormGender || 'male',
      avatar: self.data.babyFormAvatar || ''
    }

    if (self.data.editBaby) {
      updateBaby(familyId, self.data.editBaby.id, payload).then(function () {
        wx.showToast({ title: '修改成功', icon: 'success' })
        self.setData({ showBabyForm: false })
        self.loadFamily()
      }).catch(function (err) {
        wx.showToast({ title: err.message || '修改失败', icon: 'none' })
      })
    } else {
      createBaby(familyId, payload).then(function () {
        wx.showToast({ title: '添加成功', icon: 'success' })
        self.setData({ showBabyForm: false })
        self.loadFamily()
      }).catch(function (err) {
        wx.showToast({ title: err.message || '添加失败', icon: 'none' })
      })
    }
  },

  onDeleteBaby: function (e) {
    var self = this
    var babyId = e.currentTarget.dataset.id
    var familyId = self.data.familyId
    if (!babyId || !familyId) return

    wx.showModal({
      title: '确认删除',
      content: '删除后该宝宝的所有记录将不可见，确定删除吗？',
      success: function (res) {
        if (res.confirm) {
          deleteBaby(familyId, babyId).then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            self.loadFamily()
          }).catch(function (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  // ========== 成员头像点击 ==========

  onMemberAvatarTap: function (e) {
    var openid = e.currentTarget.dataset.openid
    var self = this
    if (openid !== getOpenId()) {
      wx.showToast({ title: '只能修改自己的头像', icon: 'none' })
      return
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var filePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })
        uploadAvatar(filePath).then(function (data) {
          wx.hideLoading()
          self.loadFamily()
          wx.showToast({ title: '头像已更新', icon: 'success' })
        }).catch(function (err) {
          wx.hideLoading()
          wx.showToast({ title: err.message || '上传失败', icon: 'none' })
        })
      }
    })
  },

  // ========== 权限管理 / 移除成员（长按） ==========

  onMemberLongPress: function (e) {
    var openid = e.currentTarget.dataset.openid
    var role = e.currentTarget.dataset.role
    var nickname = e.currentTarget.dataset.nickname

    if (openid === getOpenId()) {
      wx.showToast({ title: '不能操作自己', icon: 'none' })
      return
    }

    var self = this
    var isAdmin = self.data.myRole === 'admin' || self.data.myRole === 'mom'
    var roleLabel = role === 'admin' ? '管理员' : role === 'editor' ? '编辑者' : '查看者'

    // 管理员和普通成员的菜单不同
    if (isAdmin) {
      wx.showActionSheet({
        itemList: ['设为管理员', '设为编辑者', '设为查看者', '移除成员'],
        success: function (res) {
          if (res.tapIndex === 0) {
            var newRole = 'admin'
            if (newRole === role) { wx.showToast({ title: '已是该权限', icon: 'none' }); return }
            self.updateMemberRole(openid, newRole)
          } else if (res.tapIndex === 1) {
            var newRole = 'editor'
            if (newRole === role) { wx.showToast({ title: '已是该权限', icon: 'none' }); return }
            self.updateMemberRole(openid, newRole)
          } else if (res.tapIndex === 2) {
            var newRole = 'viewer'
            if (newRole === role) { wx.showToast({ title: '已是该权限', icon: 'none' }); return }
            self.updateMemberRole(openid, newRole)
          } else if (res.tapIndex === 3) {
            self.removeMember(openid, nickname)
          }
        }
      })
    } else {
      wx.showToast({ title: '只有管理员可以管理成员', icon: 'none' })
    }
  },

  updateMemberRole: function (targetOpenid, newRole) {
    var self = this
    updateFamilyPermissions(self.data.familyId, targetOpenid, newRole, getOpenId()).then(function () {
      wx.showToast({ title: '权限已更新', icon: 'success' })
      self.loadFamily()
    }).catch(function (err) {
      wx.showToast({ title: err.message || '修改失败', icon: 'none' })
    })
  },

  removeMember: function (targetOpenid, nickname) {
    var self = this
    wx.showModal({
      title: '移除成员',
      content: '确定将「' + (nickname || '该成员') + '」移出家庭吗？移除后对方将无法查看家庭信息。',
      success: function (res) {
        if (res.confirm) {
          // 尝试调用后端移除成员接口；若未实现则提示
          wx.request({
            url: 'https://your-api-domain.com/api/family/member/remove',
            method: 'POST',
            data: {
              familyId: self.data.familyId,
              targetOpenid: targetOpenid
            },
            header: { 'Content-Type': 'application/json' },
            success: function (res) {
              if (res.statusCode === 200 && res.data && res.data.success) {
                wx.showToast({ title: '已移除', icon: 'success' })
                self.loadFamily()
              } else {
                wx.showToast({ title: res.data.message || '移除失败', icon: 'none' })
              }
            },
            fail: function () {
              // 后端接口未就绪时的回退提示
              wx.showToast({ title: '移除成员功能需后端支持，请联系开发者', icon: 'none', duration: 2500 })
            }
          })
        }
      }
    })
  },

  catchTap: function () {},

  // ========== 退出登录 / 退出体验模式 ==========
  onLogout: function () {
    var self = this
    var isDemo = self.data.isDemo
    wx.showModal({
      title: isDemo ? '退出体验模式' : '退出登录',
      content: isDemo ? '退出后将返回登录页，可使用微信账号登录' : '退出后需重新授权登录，确定退出吗？',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('babycare_openid')
          wx.removeStorageSync('babycare_family_id')
          wx.removeStorageSync('babycare_my_role')
          wx.removeStorageSync('babycare_active_baby')
          wx.removeStorageSync('babycare_baby_info')
          var app = getApp()
          if (app) {
            app.globalData.activeBaby = null
            app.globalData.voicePreFill = null
          }
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
