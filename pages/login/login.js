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

		// 显示加载状态
		wx.showLoading({
			title: '登录中',
		})

		// 调用云函数获取openid
		wx.cloud.callFunction({
			name: 'login',
			success: res => {
				console.log('云函数返回结果:', res)

				if (!res.result || !res.result.openid) {
					wx.hideLoading()
					console.error('云函数返回结果异常:', res)
					wx.showToast({
						title: '登录失败',
						icon: 'none',
					})
					return
				}

				const openid = res.result.openid
				console.log('获取openid成功', openid)

				// 查询用户是否已存在
				const db = wx.cloud.database()
				db.collection('users')
					.doc(openid)
					.get()
					.then(res => {
						wx.hideLoading()
						console.log('用户已存在', res.data)
						// 更新用户信息
						db.collection('users')
							.doc(openid)
							.update({
								data: {
									nickName: userInfo.nickName,
									avatarUrl: userInfo.avatarUrl,
									updatedAt: db.serverDate(),
								},
							})

						// 保存到全局数据
						app.globalData.userInfo = res.data
						app.globalData.hasLogin = true

						// 检查个人资料完善情况
						this.checkUserProfile(res.data)
					})
					.catch(err => {
						console.log('用户不存在，创建新用户', err)
						// 创建新用户
						db.collection('users')
							.add({
								data: {
									_id: openid,
									nickName: userInfo.nickName,
									avatarUrl: userInfo.avatarUrl,
									realName: '',
									studentId: '',
									phone: '',
									isAdmin: false,
									createdAt: db.serverDate(),
								},
							})
							.then(res => {
								wx.hideLoading()
								// 保存到全局数据
								userInfo._id = openid
								app.globalData.userInfo = userInfo
								app.globalData.hasLogin = true

								// 显示成功提示
								wx.showToast({
									title: '登录成功',
									icon: 'success',
									duration: 1500,
								})

								// 跳转到个人信息完善页面
								setTimeout(() => {
									wx.redirectTo({
										url: '/pages/userinfo/userinfo',
									})
								}, 1500)
							})
							.catch(err => {
								wx.hideLoading()
								console.error('创建用户失败', err)
								wx.showToast({
									title: '登录失败',
									icon: 'none',
								})
							})
					})
			},
			fail: err => {
				wx.hideLoading()
				console.error('云函数调用失败', err)
				wx.showToast({
					title: '登录失败',
					icon: 'none',
				})
			},
		})
	},

	// 检查用户是否已完善个人资料
	checkUserProfile: function (userData) {
		if (!userData || !userData.realName || !userData.studentId || !userData.phone) {
			// 未完善个人资料，跳转到个人信息页面
			wx.redirectTo({
				url: '/pages/userinfo/userinfo',
			})
		} else {
			// 显示成功提示
			wx.showToast({
				title: '登录成功',
				icon: 'success',
				duration: 1500,
			})

			// 已完善个人资料，跳转到首页
			setTimeout(() => {
				this.navigateToIndex()
			}, 1500)
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
