const app = getApp()

Page({
	data: {
		userInfo: {},
		appointments: [],
		statusText: {
			pending: '未开始',
			completed: '已完成',
			canceled: '已取消',
		},
	},

	onLoad: function (options) {
		// 获取用户信息
		this.setData({
			userInfo: app.globalData.userInfo || {},
		})
	},

	onShow: function () {
		// 每次显示页面时从云数据库获取最新用户信息
		this.fetchUserInfo()
	},

	// 从数据库获取最新用户信息
	fetchUserInfo: function () {
		wx.showLoading({
			title: '加载中',
		})

		// 通过云函数获取用户openid
		wx.cloud.callFunction({
			name: 'login',
			success: res => {
				const openid = res.result.openid
				const db = wx.cloud.database()

				// 查询最新的用户信息
				db.collection('users')
					.doc(openid)
					.get()
					.then(res => {
						wx.hideLoading()
						if (res.data) {
							// 更新全局用户信息
							app.globalData.userInfo = res.data
							app.globalData.hasLogin = true

							// 更新页面数据
							this.setData({
								userInfo: res.data,
							})
						} else {
							wx.hideLoading()
							console.log('未找到用户信息')
						}
					})
					.catch(err => {
						wx.hideLoading()
						console.error('获取用户信息失败', err)
					})
			},
			fail: err => {
				wx.hideLoading()
				console.error('云函数调用失败', err)
			},
		})
	},

	// 选择头像
	onChooseAvatar(e) {
		console.log('头像选择事件触发，详情：', e)
		const { avatarUrl } = e.detail
		console.log('获取到的临时头像路径：', avatarUrl)

		if (!avatarUrl) {
			console.error('未获取到有效的头像路径')
			wx.showToast({
				title: '获取头像失败',
				icon: 'none',
			})
			return
		}

		// 先更新UI
		this.setData({
			'userInfo.avatarUrl': avatarUrl,
		})

		// 显示加载中
		wx.showLoading({
			title: '保存中',
		})

		// 通过Login云函数获取openid
		wx.cloud.callFunction({
			name: 'login',
			success: res => {
				console.log('登录成功，获取到的用户信息：', res.result)
				const openid = res.result.openid
				if (!openid) {
					wx.hideLoading()
					console.error('未获取到有效的openid')
					wx.showToast({
						title: '登录失败，请重试',
						icon: 'none',
					})
					return
				}

				// 获取数据库实例
				const db = wx.cloud.database()
				console.log('正在更新用户头像，openid:', openid, '头像路径:', avatarUrl)

				// 尝试直接使用本地文件路径上传到云存储
				const cloudPath = `avatars/${openid}_${new Date().getTime()}.jpg`
				wx.cloud.uploadFile({
					cloudPath: cloudPath,
					filePath: avatarUrl,
					success: uploadRes => {
						console.log('头像上传成功：', uploadRes)
						const fileID = uploadRes.fileID

						// 更新头像到数据库
						db.collection('users')
							.doc(openid)
							.update({
								data: {
									avatarUrl: fileID,
									updatedAt: db.serverDate(),
								},
							})
							.then(updateRes => {
								wx.hideLoading()
								console.log('数据库更新成功：', updateRes)

								// 更新全局用户信息
								if (app.globalData.userInfo) {
									app.globalData.userInfo.avatarUrl = fileID
								}

								// 刷新页面显示
								this.fetchUserInfo()

								// 显示成功提示
								wx.showToast({
									title: '头像更新成功',
									icon: 'success',
									duration: 1500,
								})
							})
							.catch(updateErr => {
								wx.hideLoading()
								console.error('数据库更新失败：', updateErr)
								wx.showToast({
									title: '保存失败，请重试',
									icon: 'none',
								})
							})
					},
					fail: uploadErr => {
						wx.hideLoading()
						console.error('头像上传失败：', uploadErr)
						wx.showToast({
							title: '头像上传失败',
							icon: 'none',
						})
					},
				})
			},
			fail: err => {
				wx.hideLoading()
				console.error('获取用户openid失败：', err)
				wx.showToast({
					title: '网络错误，请重试',
					icon: 'none',
				})
			},
		})
	},

	// 加载预约列表
	loadAppointments: function () {
		// 获取预约数据（实际应用中应该从服务器获取）
		const appointments = app.globalData.appointments || wx.getStorageSync('appointments') || []

		// 按日期和时间倒序排序，最新的在前面
		appointments.sort((a, b) => {
			// 先按日期比较
			if (a.date !== b.date) {
				return a.date < b.date ? 1 : -1
			}
			// 日期相同按开始时间比较
			return a.startTime < b.startTime ? 1 : -1
		})

		this.setData({
			appointments,
		})
	},

	// 跳转到预约详情
	goToDetail: function (e) {
		const id = e.currentTarget.dataset.id
		wx.navigateTo({
			url: `/pages/detail/detail?id=${id}`,
		})
	},

	// 跳转到预约页
	goToIndex: function () {
		wx.switchTab({
			url: '/pages/index/index',
		})
	},

	// 取消预约
	cancelAppointment: function (e) {
		const id = e.currentTarget.dataset.id

		wx.showModal({
			title: '提示',
			content: '确定要取消这个预约吗？',
			success: res => {
				if (res.confirm) {
					this.doCancelAppointment(id)
				}
			},
		})
	},

	// 执行取消预约
	doCancelAppointment: function (id) {
		// 获取所有预约
		let appointments = app.globalData.appointments || []

		// 找到要取消的预约
		const index = appointments.findIndex(item => item.id === id)

		if (index !== -1) {
			// 更新状态为已取消
			appointments[index].status = 'canceled'
			app.globalData.appointments = appointments

			// 保存到本地存储
			wx.setStorageSync('appointments', appointments)

			// 刷新列表
			this.loadAppointments()

			// 显示取消成功提示
			wx.showToast({
				title: '预约已取消',
				icon: 'success',
			})
		}
	},

	// 跳转到我的预约页面
	goToMyAppointments: function () {
		wx.navigateTo({
			url: '/pages/my-appointments/my-appointments',
		})
	},

	// 跳转到个人信息页面
	goToUserInfo: function () {
		wx.navigateTo({
			url: '/pages/userinfo/userinfo',
		})
	},

	// 跳转到设置页面
	goToSettings: function () {
		wx.navigateTo({
			url: '/pages/settings/settings',
		})
	},

	// 退出登录
	logout: function () {
		wx.showModal({
			title: '确认退出',
			content: '确定要退出登录吗？',
			success: res => {
				if (res.confirm) {
					// 清除用户登录状态
					app.globalData.userInfo = null
					app.globalData.hasLogin = false

					// 跳转到登录页
					wx.reLaunch({
						url: '/pages/login/login',
					})

					wx.showToast({
						title: '已退出登录',
						icon: 'success',
					})
				}
			},
		})
	},
})
