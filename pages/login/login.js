const app = getApp()

Page({
	data: {
		canIUse: wx.canIUse('button.open-type.getUserInfo'),
	},

	onLoad: function () {
		console.log('登录页面加载')
		// 检查用户是否已经登录
		if (app.globalData.hasLogin) {
			this.checkUserProfile()
		}
	},

	// 获取用户信息
	onGetUserInfo: function (e) {
		console.log('获取用户信息', e)

		// 在新版微信中，需要通过wx.getUserProfile获取用户信息
		wx.getUserProfile({
			desc: '用于完善用户资料',
			success: res => {
				this.loginSuccess(res.userInfo)
			},
			fail: err => {
				console.error('获取用户信息失败', err)
				// 即使获取用户信息失败，也允许用户登录
				this.loginSuccess({
					nickName: '访客用户',
					avatarUrl: '',
				})
			},
		})
	},

	// 登录成功处理
	loginSuccess: function (userInfo) {
		console.log('登录成功', userInfo)

		// 保存用户信息
		app.globalData.userInfo = userInfo
		app.globalData.hasLogin = true

		// 保存到本地存储
		wx.setStorageSync('userInfo', userInfo)
		wx.setStorageSync('hasLogin', true)

		// 显示成功提示
		wx.showToast({
			title: '登录成功',
			icon: 'success',
			duration: 1500,
		})

		// 检查是否已完善个人资料
		setTimeout(() => {
			this.checkUserProfile()
		}, 1500)
	},

	// 检查用户是否已完善个人资料
	checkUserProfile: function () {
		const userProfile = wx.getStorageSync('userProfile')

		if (!userProfile || !userProfile.name || !userProfile.studentId || !userProfile.phone) {
			// 未完善个人资料，跳转到个人信息页面
			wx.redirectTo({
				url: '/pages/userinfo/userinfo',
			})
		} else {
			// 已完善个人资料，跳转到首页
			this.navigateToIndex()
		}
	},

	// 跳转到首页
	navigateToIndex: function () {
		console.log('跳转到首页')
		wx.switchTab({
			url: '/pages/index/index',
		})
	},

	// 显示用户协议
	showUserAgreement: function () {
		wx.showModal({
			title: '用户协议',
			content: '这里是面试室预约助手的用户协议内容...',
			showCancel: false,
		})
	},

	// 显示隐私政策
	showPrivacyPolicy: function () {
		wx.showModal({
			title: '隐私政策',
			content: '这里是面试室预约助手的隐私政策内容...',
			showCancel: false,
		})
	},
})
