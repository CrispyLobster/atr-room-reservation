const app = getApp()

Page({
	data: {
		canIUse: wx.canIUse('getUserProfile'),
	},

	onLoad: function () {
		console.log('登录页面加载')
		// 检查用户是否已经登录
		if (app.globalData.hasLogin) {
			console.log('用户已登录，跳转到首页')
			// 已登录，直接跳转到首页，不再检查个人信息
			this.navigateToIndex()
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

		// 获取之前缓存的头像信息
		const avatarCache = wx.getStorageSync('avatarCache') || {}

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

						// 创建更新数据对象 - 只更新昵称，保留用户自定义头像
						const updateData = {
							nickName: userInfo.nickName,
							updatedAt: db.serverDate(),
						}

						// 优先使用数据库中的云存储头像
						if (res.data.avatarUrl && res.data.avatarUrl.indexOf('cloud://') === 0) {
							console.log('使用数据库中现有的云存储头像')
							// 不更新头像，保留原有云存储头像
						}
						// 其次使用缓存的云存储头像
						else if (avatarCache.avatarUrl && avatarCache.avatarUrl.indexOf('cloud://') === 0) {
							console.log('使用缓存的云存储头像')
							updateData.avatarUrl = avatarCache.avatarUrl
						}
						// 最后使用微信默认头像
						else {
							console.log('使用微信默认头像')
							updateData.avatarUrl = userInfo.avatarUrl
						}

						// 更新用户信息
						db.collection('users')
							.doc(openid)
							.update({
								data: updateData,
							})
							.then(updateRes => {
								console.log('更新用户信息成功', updateRes)

								// 保存到全局数据 - 使用最新的数据
								const updatedUserInfo = {
									...res.data,
									nickName: userInfo.nickName,
									// 保留原有头像或使用新头像
									avatarUrl: updateData.avatarUrl || res.data.avatarUrl,
								}

								// 如果有缓存的临时头像URL，也添加到用户信息中
								if (avatarCache.tempAvatarUrl) {
									updatedUserInfo.tempAvatarUrl = avatarCache.tempAvatarUrl
								}

								app.globalData.userInfo = updatedUserInfo
								app.globalData.hasLogin = true

								// 保存更新后的用户信息到本地存储
								wx.setStorageSync('userInfo', updatedUserInfo)

								wx.hideLoading()

								// 登录成功后清除头像缓存
								wx.removeStorageSync('avatarCache')

								// 检查个人资料完善情况
								this.checkUserProfile(updatedUserInfo)
							})
							.catch(err => {
								wx.hideLoading()
								console.error('更新用户信息失败', err)
								wx.showToast({
									title: '登录异常',
									icon: 'none',
								})
							})
					})
					.catch(err => {
						console.log('用户不存在，创建新用户', err)

						// 确定使用哪个头像URL
						let avatarToUse = userInfo.avatarUrl

						// 优先使用缓存的云存储头像
						if (avatarCache.avatarUrl && avatarCache.avatarUrl.indexOf('cloud://') === 0) {
							console.log('新用户使用缓存的云存储头像')
							avatarToUse = avatarCache.avatarUrl
						}

						// 创建新用户
						db.collection('users')
							.add({
								data: {
									_id: openid,
									nickName: userInfo.nickName,
									avatarUrl: avatarToUse,
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
									avatarUrl: avatarToUse,
									realName: '',
									studentId: '',
									phone: '',
									isAdmin: false,
								}

								// 如果有缓存的临时头像URL，也添加到用户信息中
								if (avatarCache.tempAvatarUrl) {
									newUserInfo.tempAvatarUrl = avatarCache.tempAvatarUrl
								}

								// 确认全局变量包含昵称和头像
								console.log('保存到全局变量的用户信息:', newUserInfo)

								app.globalData.userInfo = newUserInfo
								app.globalData.hasLogin = true

								// 保存到本地存储
								wx.setStorageSync('userInfo', newUserInfo)

								// 登录成功后清除头像缓存
								wx.removeStorageSync('avatarCache')

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
		// 如果在数据库中有姓名、学号和电话，则认为用户已完善个人资料
		if (userData && userData.realName && userData.studentId && userData.phone) {
			console.log('用户已完善个人资料，直接跳转到首页')
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
		} else {
			console.log('用户未完善个人资料，跳转到个人信息页面')
			// 未完善个人资料，跳转到个人信息页面
			setTimeout(() => {
				wx.redirectTo({
					url: '/pages/userinfo/userinfo',
				})
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
			content: '这里是ATR研讨室预约助手的用户协议内容...',
			showCancel: false,
		})
	},

	// 显示隐私政策
	showPrivacyPolicy: function () {
		wx.showModal({
			title: '隐私政策',
			content: '这里是ATR研讨室预约助手的隐私政策内容...',
			showCancel: false,
		})
	},
})
