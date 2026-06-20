var { createFamily, joinFamily, getFamilyMembers, getBabies, createBaby, updateBaby, deleteBaby, getFamilyPermissions, updateFamilyPermissions, uploadAvatar } = require('../../utils/api')
var { getOpenId, getFamilyId, setFamilyId, getMyRole, setMyRole, getActiveBaby, setActiveBaby } = require('../../utils/baby')

Page({
  data: {
    openid: '',
    familyId: '',
    babyName: '宝宝',
    babyBirthday: '',
    babyAvatar: '',
    userAvatar: '',
    identityGreeting: '宝宝',
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
    this.setData({ openid: openid, familyId: familyId, myRole: getMyRole() })
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

        // 从家庭成员列表中取自己的头像
        var members = res.members || []
        var userAvatar = ''
        for (var i = 0; i < members.length; i++) {
          if (members[i].openid === openid && members[i].avatar_url) {
            userAvatar = members[i].avatar_url
            break
          }
        }
        // 回退到本地 userInfo
        if (!userAvatar) {
          var userInfo = wx.getStorageSync('userInfo')
          if (userInfo && userInfo.avatarUrl) userAvatar = userInfo.avatarUrl
        }

        self.setData({
          familyId: res.familyId,
          babyName: babyName,
          babyBirthday: res.babyBirthday || '',
          babyAvatar: res.babyAvatar || '',
          userAvatar: userAvatar,
          identityGreeting: identityGreeting,
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

  // 宝宝头像：拍照或相册
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

  // 提交宝宝表单（添加/修改）
  onSubmitBaby: function () {
    var self = this
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

  // 删除宝宝
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
          // 头像上传成功，重新加载家庭成员信息
          self.loadFamily()
          wx.showToast({ title: '头像已更新', icon: 'success' })
        }).catch(function (err) {
          wx.hideLoading()
          wx.showToast({ title: err.message || '上传失败', icon: 'none' })
        })
      }
    })
  },

  // ========== 权限管理（长按成员） ==========

  onMemberLongPress: function (e) {
    var openid = e.currentTarget.dataset.openid
    var role = e.currentTarget.dataset.role
    var nickname = e.currentTarget.dataset.nickname

    if (this.data.myRole !== 'admin' && this.data.myRole !== 'mom') {
      wx.showToast({ title: '只有管理员可以修改权限', icon: 'none' })
      return
    }
    if (openid === getOpenId()) {
      wx.showToast({ title: '不能修改自己的权限', icon: 'none' })
      return
    }

    var self = this
    var roleLabel = role === 'admin' ? '管理员' : role === 'editor' ? '编辑者' : '查看者'
    wx.showActionSheet({
      itemList: ['设为管理员', '设为编辑者', '设为查看者', '取消'],
      success: function (res) {
        var newRole = null
        if (res.tapIndex === 0) newRole = 'admin'
        else if (res.tapIndex === 1) newRole = 'editor'
        else if (res.tapIndex === 2) newRole = 'viewer'
        else return

        if (newRole === role) {
          wx.showToast({ title: '已是该权限', icon: 'none' })
          return
        }

        updateFamilyPermissions(self.data.familyId, openid, newRole, getOpenId()).then(function () {
          wx.showToast({ title: '权限已更新', icon: 'success' })
          self.loadFamily()
        }).catch(function (err) {
          wx.showToast({ title: err.message || '修改失败', icon: 'none' })
        })
      }
    })
  },

  catchTap: function () {},

  // ========== 退出登录 ==========
  onLogout: function () {
    var self = this
    wx.showModal({
      title: '退出登录',
      content: '退出后需重新授权登录，确定退出吗？',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('babycare_openid')
          wx.removeStorageSync('babycare_family_id')
          wx.removeStorageSync('babycare_my_role')
          wx.removeStorageSync('babycare_active_baby')
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
