const app = getApp()

Page({
	data: {
		userInfo: {},
		appointments: [],
		avatarLoading: true,
		statusText: {
			pending: '未开始',
			completed: '已完成',
			canceled: '已取消',
		},
	},

	onLoad: function (options) {
		// 检查是否已经有全局缓存的用户信息和头像
		if (app.globalData.userInfo) {
			// 优先使用已缓存的信息，避免加载闪烁
			const userInfo = app.globalData.userInfo

			this.setData({
				userInfo: userInfo,
				// 如果有临时头像URL，直接使用，不显示加载状态
				avatarLoading: !(
					userInfo.tempAvatarUrl ||
					(userInfo.avatarUrl && userInfo.avatarUrl.indexOf('cloud://') < 0)
				),
			})

			// 如果有临时URL直接使用
			if (userInfo.tempAvatarUrl) {
				console.log('使用缓存的临时头像URL')
				this.setData({
					'userInfo.tempAvatarUrl': userInfo.tempAvatarUrl,
					avatarLoading: false,
				})
			}
			// 如果有非云存储URL，也直接使用
			else if (userInfo.avatarUrl && userInfo.avatarUrl.indexOf('cloud://') < 0) {
				console.log('使用非云存储头像URL')
				this.setData({
					avatarLoading: false,
				})
			}
		} else {
			// 无全局缓存，设置空数据
			this.setData({
				userInfo: {},
				avatarLoading: true,
			})
		}

		// 后台静默加载最新用户信息
		this.silentFetchUserInfo()
	},

	onShow: function () {
		// 如果没有用户信息或头像，才执行加载
		if (!this.data.userInfo.avatarUrl && !this.data.userInfo.tempAvatarUrl) {
			this.fetchUserInfo()
		} else {
			// 否则静默更新，不影响界面
			this.silentFetchUserInfo()
		}
	},

	// 静默获取用户信息，不改变UI状态
	silentFetchUserInfo: function () {
		// 不更改加载状态，后台静默刷新
		wx.cloud.callFunction({
			name: 'login',
			success: res => {
				const openid = res.result.openid
				const db = wx.cloud.database()

				// 查询用户信息
				db.collection('users')
					.doc(openid)
					.get()
					.then(res => {
						if (res.data) {
							// 更新全局用户信息
							app.globalData.userInfo = res.data
							app.globalData.hasLogin = true

							// 如果有头像，获取临时URL
							if (res.data.avatarUrl && res.data.avatarUrl.indexOf('cloud://') === 0) {
								console.log('静默获取用户头像临时URL')
								wx.cloud.getTempFileURL({
									fileList: [res.data.avatarUrl],
									success: tempRes => {
										if (
											tempRes.fileList &&
											tempRes.fileList[0] &&
											tempRes.fileList[0].tempFileURL
										) {
											console.log('静默获取临时头像URL成功')
											// 更新到页面和全局
											const tempUrl = tempRes.fileList[0].tempFileURL

											this.setData({
												userInfo: res.data,
												'userInfo.tempAvatarUrl': tempUrl,
											})

											if (app.globalData.userInfo) {
												app.globalData.userInfo.tempAvatarUrl = tempUrl
											}
										}
									},
								})
							} else {
								// 普通URL头像
								this.setData({
									userInfo: res.data,
								})
							}
						}
					})
					.catch(err => {
						console.error('静默获取用户信息失败', err)
					})
			},
		})
	},

	// 从数据库获取最新用户信息 (带UI加载状态)
	fetchUserInfo: function () {
		// 显示加载状态
		this.setData({
			avatarLoading: true,
		})

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
						if (res.data) {
							// 更新全局用户信息
							app.globalData.userInfo = res.data
							app.globalData.hasLogin = true

							// 先更新用户基本信息
							this.setData({
								userInfo: res.data,
							})

							// 如果已经有临时头像URL，直接使用
							if (res.data.tempAvatarUrl) {
								this.setData({
									'userInfo.tempAvatarUrl': res.data.tempAvatarUrl,
									avatarLoading: false,
								})
								return
							}

							// 如果头像是云存储路径，获取临时URL
							if (res.data.avatarUrl && res.data.avatarUrl.indexOf('cloud://') === 0) {
								console.log('正在获取用户头像临时URL')
								wx.cloud.getTempFileURL({
									fileList: [res.data.avatarUrl],
									success: tempRes => {
										if (
											tempRes.fileList &&
											tempRes.fileList[0] &&
											tempRes.fileList[0].tempFileURL
										) {
											console.log('获取到临时头像URL:', tempRes.fileList[0].tempFileURL)
											// 更新到页面
											this.setData({
												'userInfo.tempAvatarUrl': tempRes.fileList[0].tempFileURL,
												avatarLoading: false,
											})

											// 同时更新到全局，方便下次使用
											if (app.globalData.userInfo) {
												app.globalData.userInfo.tempAvatarUrl = tempRes.fileList[0].tempFileURL
											}
										} else {
											this.setData({
												avatarLoading: false,
											})
										}
									},
									fail: err => {
										console.error('获取临时头像URL失败:', err)
										this.setData({
											avatarLoading: false,
										})
									},
								})
							} else {
								// 如果是普通URL头像，直接标记加载完成
								this.setData({
									avatarLoading: false,
								})
							}
						} else {
							this.setData({
								avatarLoading: false,
							})
						}
					})
					.catch(err => {
						console.error('获取用户信息失败', err)
						this.setData({
							avatarLoading: false,
						})
					})
			},
			fail: err => {
				console.error('云函数调用失败', err)
				this.setData({
					avatarLoading: false,
				})
			},
		})
	},

	// 选择头像
	onChooseAvatar(e) {
		console.log('用户选择了头像：', e.detail)
		const { avatarUrl } = e.detail

		// 显示加载中
		wx.showLoading({
			title: '保存中',
		})

		// 获取数据库和当前用户ID
		const db = wx.cloud.database()

		// 先将临时文件上传到云存储
		const cloudPath = `avatar/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`

		wx.cloud.uploadFile({
			cloudPath: cloudPath,
			filePath: avatarUrl,
			success: uploadRes => {
				// 获取云存储文件ID
				const cloudFileId = uploadRes.fileID

				// 调用登录云函数获取用户openid
				wx.cloud.callFunction({
					name: 'login',
					success: res => {
						const openid = res.result.openid

						// 更新头像到数据库（存储云文件ID）
						db.collection('users')
							.doc(openid)
							.update({
								data: {
									avatarUrl: cloudFileId,
									updatedAt: db.serverDate(),
								},
							})
							.then(res => {
								wx.hideLoading()
								console.log('更新头像成功', res)

								// 获取临时访问链接
								wx.cloud.getTempFileURL({
									fileList: [cloudFileId],
									success: tempRes => {
										if (
											tempRes.fileList &&
											tempRes.fileList[0] &&
											tempRes.fileList[0].tempFileURL
										) {
											const tempUrl = tempRes.fileList[0].tempFileURL

											// 更新全局用户信息
											if (app.globalData.userInfo) {
												app.globalData.userInfo.avatarUrl = cloudFileId
												app.globalData.userInfo.tempAvatarUrl = tempUrl
											}

											// 更新当前页面显示
											this.setData({
												'userInfo.avatarUrl': cloudFileId,
												'userInfo.tempAvatarUrl': tempUrl,
												avatarLoading: false,
											})
										}
									},
								})

								// 显示成功提示
								wx.showToast({
									title: '头像更新成功',
									icon: 'success',
									duration: 1500,
								})
							})
							.catch(err => {
								wx.hideLoading()
								console.error('更新头像失败', err)
								wx.showToast({
									title: '保存失败，请重试',
									icon: 'none',
								})
							})
					},
					fail: err => {
						wx.hideLoading()
						console.error('获取用户openid失败', err)
						wx.showToast({
							title: '网络错误，请重试',
							icon: 'none',
						})
					},
				})
			},
			fail: err => {
				wx.hideLoading()
				console.error('上传头像到云存储失败', err)
				wx.showToast({
					title: '头像上传失败，请重试',
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
