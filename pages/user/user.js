/**
 * 文件: pages/user/user.js
 * 功能: 个人中心页面，处理用户信息展示和管理
 * 包含:
 * - 用户个人信息和头像显示
 * - 自定义头像上传功能
 * - 云存储头像处理和临时URL获取
 * - 预约记录查询和展示
 * - 预约状态管理
 * - 退出登录功能
 * - 页面导航跳转
 *
 * 这是用户管理个人信息和预约记录的主要界面
 */

const app = getApp()

Page({
	data: {
		userInfo: {},
		appointments: [],
		avatarLoading: true,
		avatarUploading: false,
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

			// 直接判断是否有可用的头像URL（临时URL或普通URL）
			const hasValidAvatar =
				userInfo.tempAvatarUrl || (userInfo.avatarUrl && userInfo.avatarUrl.indexOf('cloud://') < 0)

			this.setData({
				userInfo: userInfo,
				// 如果有临时头像URL，直接使用，不显示加载状态
				avatarLoading: !hasValidAvatar,
			})

			// 有有效的头像URL时，不再进行后台更新
			if (hasValidAvatar) {
				console.log('使用缓存的头像URL，跳过后台更新')
				return
			}

			// 不符合快速加载条件时，才进行后台静默更新
			setTimeout(() => {
				this.silentFetchUserInfo()
			}, 1000) // 延迟1秒后再尝试更新，避免初始渲染时的状态变化
		} else {
			// 无全局缓存，设置空数据
			this.setData({
				userInfo: {},
				avatarLoading: true,
			})

			// 无缓存时立即获取用户信息
			this.fetchUserInfo()
		}
	},

	onShow: function () {
		// 只有在完全没有用户信息时才主动获取最新信息
		if (!this.data.userInfo.nickName && !this.data.userInfo.realName) {
			this.fetchUserInfo()
		} else if (!this.data.userInfo.avatarUrl && !this.data.userInfo.tempAvatarUrl) {
			// 只有在没有头像的情况下才更新头像
			this.silentFetchUserInfo()
		}
	},

	// 静默获取用户信息，不改变UI状态
	silentFetchUserInfo: function () {
		// 如果正在上传头像，不进行静默更新
		if (this.data.avatarUploading) {
			return
		}

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
							// 更新全局用户信息（仅保存到全局，不立即更新界面）
							app.globalData.userInfo = res.data
							app.globalData.hasLogin = true

							// 如果有头像，先比较是否与当前显示的相同
							if (
								res.data.avatarUrl &&
								this.data.userInfo.avatarUrl &&
								res.data.avatarUrl === this.data.userInfo.avatarUrl
							) {
								// 头像URL相同，无需更新
								return
							}

							// 如果头像是云存储路径并且与当前不同，获取临时URL但不立即更新界面
							if (res.data.avatarUrl && res.data.avatarUrl.indexOf('cloud://') === 0) {
								// 避免正在上传头像时重复获取
								if (this.data.avatarUploading) {
									return
								}

								console.log('静默获取用户头像临时URL')
								wx.cloud.getTempFileURL({
									fileList: [res.data.avatarUrl],
									success: tempRes => {
										// 如果开始上传了新头像，不继续处理
										if (this.data.avatarUploading) {
											return
										}

										if (
											tempRes.fileList &&
											tempRes.fileList[0] &&
											tempRes.fileList[0].tempFileURL
										) {
											console.log('静默获取临时头像URL成功')
											// 只更新全局缓存，不更新当前页面显示
											const tempUrl = tempRes.fileList[0].tempFileURL

											if (app.globalData.userInfo) {
												app.globalData.userInfo.tempAvatarUrl = tempUrl
											}

											// 只有当用户没有头像时，才更新界面显示
											if (!this.data.userInfo.tempAvatarUrl && !this.data.userInfo.avatarUrl) {
												this.setData({
													userInfo: res.data,
													'userInfo.tempAvatarUrl': tempUrl,
													avatarLoading: false,
												})
											}
										}
									},
								})
							} else if (!this.data.userInfo.avatarUrl && !this.data.userInfo.tempAvatarUrl) {
								// 只有当前没有头像时，才更新普通URL头像
								if (!this.data.avatarUploading) {
									this.setData({
										userInfo: res.data,
									})
								}
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
		// 如果正在上传头像，不进行数据库更新
		if (this.data.avatarUploading) {
			return
		}

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

		// 设置避免头像闪烁的标记，避免在上传过程中更新头像
		this.setData({
			avatarLoading: true,
			avatarUploading: true,
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

											// 在获取到临时URL后一次性更新状态
											this.setData({
												userInfo: {
													...this.data.userInfo,
													avatarUrl: cloudFileId,
													tempAvatarUrl: tempUrl,
												},
												avatarLoading: false,
												avatarUploading: false,
											})

											// 隐藏加载提示并显示成功提示
											wx.hideLoading()
											wx.showToast({
												title: '头像更新成功',
												icon: 'success',
												duration: 1500,
											})
										} else {
											this.setData({
												avatarLoading: false,
												avatarUploading: false,
											})
											wx.hideLoading()
											wx.showToast({
												title: '头像处理失败',
												icon: 'none',
											})
										}
									},
									fail: err => {
										console.error('获取临时头像URL失败:', err)
										this.setData({
											avatarLoading: false,
											avatarUploading: false,
										})
										wx.hideLoading()
										wx.showToast({
											title: '头像处理失败',
											icon: 'none',
										})
									},
								})
							})
							.catch(err => {
								wx.hideLoading()
								console.error('更新头像失败', err)
								this.setData({
									avatarLoading: false,
									avatarUploading: false,
								})
								wx.showToast({
									title: '保存失败，请重试',
									icon: 'none',
								})
							})
					},
					fail: err => {
						wx.hideLoading()
						console.error('获取用户openid失败', err)
						this.setData({
							avatarLoading: false,
							avatarUploading: false,
						})
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
				this.setData({
					avatarLoading: false,
					avatarUploading: false,
				})
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
					// 保存当前用户头像URL，以便重新登录时使用
					const currentAvatarUrl = app.globalData.userInfo
						? app.globalData.userInfo.avatarUrl
						: null
					const currentTempAvatarUrl = app.globalData.userInfo
						? app.globalData.userInfo.tempAvatarUrl
						: null

					// 清除用户登录状态
					app.globalData.userInfo = null
					app.globalData.hasLogin = false

					// 清除本地存储中的登录状态，但保留头像信息
					if (currentAvatarUrl || currentTempAvatarUrl) {
						wx.setStorageSync('avatarCache', {
							avatarUrl: currentAvatarUrl,
							tempAvatarUrl: currentTempAvatarUrl,
						})
					}

					// 清除用户登录信息
					wx.removeStorageSync('userInfo')

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
