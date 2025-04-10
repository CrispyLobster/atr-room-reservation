const app = getApp()

Page({
	data: {
		canIUse: wx.canIUse('getUserProfile'),
	},

	onLoad: function () {
		console.log('登录页面加载')
		// 检查用户是否已经登录
		if (app.globalData.hasLogin) {
			this.checkUserProfile()
		}
	},

	// 获取用户信息
	onGetUserInfo: function () {
		console.log('请求获取用户信息')

		// 使用新版接口获取用户信息
		wx.getUserProfile({
			desc: '用于显示您的微信头像和昵称', // 声明获取用户个人信息后的用途
			lang: 'zh_CN',
			success: res => {
				const userInfo = res.userInfo
				console.log('获取用户信息成功', userInfo)
				console.log('昵称:', userInfo.nickName)
				console.log('头像:', userInfo.avatarUrl)

				// 确保获取到了用户的昵称和头像
				if (!userInfo.nickName || !userInfo.avatarUrl) {
					wx.showToast({
						title: '未能获取微信信息',
						icon: 'none',
					})
					return
				}

				this.loginSuccess(userInfo)
			},
			fail: err => {
				console.error('获取用户信息失败', err)
				wx.showToast({
					title: '需要授权才能使用',
					icon: 'none',
				})
			},
		})
	},

	// 登录成功处理
	loginSuccess: function (userInfo) {
		console.log('处理登录信息', userInfo)

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
						console.log('用户已存在，原数据:', res.data)

						// 每次登录都更新用户的微信昵称和头像
						db.collection('users')
							.doc(openid)
							.update({
								data: {
									nickName: userInfo.nickName,
									avatarUrl: userInfo.avatarUrl,
									updatedAt: db.serverDate(),
								},
							})
							.then(updateRes => {
								console.log('更新用户微信信息成功', updateRes)

								// 保存到全局数据 - 使用最新的微信昵称和头像
								const updatedUserInfo = {
									...res.data,
									nickName: userInfo.nickName,
									avatarUrl: userInfo.avatarUrl,
								}

								app.globalData.userInfo = updatedUserInfo
								app.globalData.hasLogin = true

								wx.hideLoading()

								// 检查个人资料完善情况
								this.checkUserProfile(updatedUserInfo)
							})
							.catch(err => {
								wx.hideLoading()
								console.error('更新用户微信信息失败', err)
								wx.showToast({
									title: '登录异常',
									icon: 'none',
								})
							})
					})
					.catch(err => {
						console.log('用户不存在，创建新用户', err)
						console.log('将创建新用户，昵称:', userInfo.nickName, '头像:', userInfo.avatarUrl)

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
								console.log('创建新用户成功:', res)
								wx.hideLoading()

								// 保存到全局数据
								const newUserInfo = {
									_id: openid,
									nickName: userInfo.nickName,
									avatarUrl: userInfo.avatarUrl,
									realName: '',
									studentId: '',
									phone: '',
									isAdmin: false,
								}

								// 确认全局变量包含昵称和头像
								console.log('保存到全局变量的用户信息:', newUserInfo)

								app.globalData.userInfo = newUserInfo
								app.globalData.hasLogin = true

								wx.showToast({
									title: '登录成功',
									icon: 'success',
									duration: 1000,
								})

								// 首次登录，直接跳转到个人信息完善页面
								setTimeout(() => {
									wx.redirectTo({
										url: '/pages/userinfo/userinfo',
									})
								}, 1000)
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
				duration: 1000,
			})

			// 已完善个人资料，跳转到首页
			setTimeout(() => {
				this.navigateToIndex()
			}, 1000)
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
